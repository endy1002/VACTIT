
suppressWarnings(suppressPackageStartupMessages({
  library(jsonlite)
  library(dplyr)
  library(tibble)
  library(purrr)
  library(readr)
  library(stringr)
  # mirt loaded when needed
}))

## process_responses(data)
## - data: list with `responses` (matrix-like or list-of-lists) and optional `names` and optional `item_params`
## Returns: list with `students` (dataframe) and `items` (list of item param tibbles)
process_responses <- function(data){
  if (is.null(data) || is.null(data$responses)) stop('missing responses')

  resp_mat <- as.data.frame(data$responses)
  resp_mat[] <- lapply(resp_mat, function(x) as.numeric(x))

  # Accept both column-oriented (list of 120 question columns) or row-oriented (list of users)
  # If incoming is row-oriented, transpose so columns = questions
  nr <- nrow(resp_mat)
  nc <- ncol(resp_mat)
  if (nc < 120 && nr >= 120) {
    resp_mat <- as.data.frame(t(resp_mat))
    resp_mat[] <- lapply(resp_mat, function(x) as.numeric(x))
    nr <- nrow(resp_mat)
    nc <- ncol(resp_mat)
  }

  if (nc < 120) stop(sprintf('need at least 120 item columns; got %d', nc))
  if (nc > 120) resp_mat <- resp_mat[, 1:120]

  if (!is.null(data$names) && length(data$names) == nrow(resp_mat)) {
    names_vec <- as.character(data$names)
  } else {
    names_vec <- paste0('Student', seq_len(nrow(resp_mat)))
  }

  colnames(resp_mat) <- paste0('Q', seq_len(ncol(resp_mat)))
  df <- tibble::as_tibble(resp_mat)
  df <- df %>% tibble::add_column(name = names_vec, .before = 1)

  if (!requireNamespace('mirt', quietly = TRUE)) stop("R package 'mirt' is required. Install via install.packages('mirt')")
  library(mirt)

  fit_section <- function(df, q_from, q_to, section_code, section_label) {
    sel <- paste0('Q', q_from:q_to)
    data_items <- df[, sel, drop = FALSE]

    is_nonvary <- function(x) { ux <- unique(na.omit(x)); length(ux) == 1 }
    nonvary <- sel[purrr::map_lgl(sel, ~ is_nonvary(data_items[[.x]]))]
    use_items <- setdiff(sel, nonvary)
    if (length(use_items) < 3) stop(sprintf('[%s] not enough valid items after removing non-varying', section_label))
    data_use <- data_items[, use_items, drop = FALSE]

    item_params <- NULL
    fit <- NULL
    
    # Check if we have pre-calculated params for this section
    section_params_df <- NULL
    if (!is.null(data$item_params) && !is.null(data$item_params[[section_code]])) {
        section_params_df <- as.data.frame(data$item_params[[section_code]])
    }

    if (!is.null(section_params_df)) {
        
        valid_param_items <- intersect(colnames(data_use), section_params_df$Item)
        if (length(valid_param_items) < 1) stop(paste0('No matching items for fixed params in ', section_label))
        
        data_use <- data_use[, valid_param_items, drop=FALSE]
        
        # Subset params to match data_use columns order
        current_params <- section_params_df %>% filter(Item %in% valid_param_items) %>% arrange(match(Item, colnames(data_use)))
      
        sv <- mirt::mirt(data_use, 1, itemtype = '2PL', pars = 'values', verbose = FALSE)
        
        # Update values
        for(i in seq_len(nrow(current_params))) {
            itm_name <- current_params$Item[i]
            
            val_a <- current_params$a[i]
            val_b <- current_params$b[i]
            val_d <- -1 * val_a * val_b
            
            sv[sv$item == itm_name & sv$name == 'a1', 'value'] <- val_a
            sv[sv$item == itm_name & sv$name == 'd',  'value'] <- val_d
            
            # Fix them so they are not estimated
            sv[sv$item == itm_name & (sv$name == 'a1' | sv$name == 'd'), 'est'] <- FALSE
        }
        
        # Run mirt with fixed parameters (should be instant-ish)
        fit <- mirt::mirt(data_use, 1, itemtype = '2PL', pars = sv, verbose = FALSE, TOL = 1e-4, technical = list(warn = FALSE))
        
        item_params <- current_params

    } else {
        # --- SLOW PATH: Calibrate from scratch ---
        set.seed(123)
        fit <- tryCatch({ mirt::mirt(data_use, 1, itemtype = '2PL', verbose = FALSE) }, error = function(e) stop(paste0('fit error: ', e$message)))
        
        co <- mirt::coef(fit, IRTpars = TRUE, simplify = TRUE)$items
        item_params <- tibble::tibble(Item = rownames(co), a = as.numeric(co[, 'a']), b = as.numeric(co[, 'b']))
        prop_correct <- colMeans(data_use, na.rm = TRUE)
        item_params <- item_params %>% dplyr::left_join(tibble::tibble(Item = names(prop_correct), Prop_Correct = as.numeric(prop_correct)), by = 'Item')
    }

    fs <- mirt::fscores(fit, method = 'EAP', full.scores.SE = TRUE)
    theta <- as.numeric(fs[,1]); se <- as.numeric(fs[,2])

    # FIX: raw_score must count ALL items in the section (data_items), not just
    # the filtered subset (data_use) which excludes non-varying items.
    raw_score <- rowSums(data_items, na.rm = TRUE)

    # FIX: Use TCC-based scoring instead of arbitrary [-4,4] linear mapping.
    # For each theta, compute the expected proportion correct using the 2PL ICC:
    #   P(x=1 | theta, a, b) = 1 / (1 + exp(-a*(theta - b)))
    # Then scale expected proportion to 0–300.
    # This ensures: 0 correct → score ≈ 0, all correct → score ≈ 300.
    n_section_items <- length(sel)  # always 30 (the full section)
    a_vec <- item_params$a
    b_vec <- item_params$b

    score_0_300 <- sapply(theta, function(t) {
      probs <- 1 / (1 + exp(-a_vec * (t - b_vec)))
      expected_correct <- sum(probs)
      # Scale: expected_correct out of n fitted items → proportion → 0-300
      300 * expected_correct / length(a_vec)
    })
    score_0_300 <- pmin(pmax(score_0_300, 0), 300)
    score_0_300[is.na(score_0_300)] <- NA_real_

    student_scores <- tibble::tibble(name = df$name)
    student_scores[[paste0('theta_', section_code)]] <- theta
    student_scores[[paste0('se_', section_code)]] <- se
    student_scores[[paste0('raw_', section_code)]] <- raw_score
    student_scores[[paste0('score0_300_', section_code)]] <- score_0_300

    # write CSVs
    readr::write_csv(student_scores, paste0('student_scores_2pl_', section_code, '.csv'))
    readr::write_csv(item_params, paste0('item_params_2pl_', section_code, '.csv'))

    list(scores = student_scores, items = item_params, fit = fit, removed = nonvary, used = use_items)
  }

  res_vi  <- fit_section(df, 1, 30, 'vi', 'Tiếng Việt')
  res_en  <- fit_section(df, 31, 60, 'en', 'Tiếng Anh')
  res_mth <- fit_section(df, 61, 90, 'math', 'Toán học')
  res_sci <- fit_section(df, 91, 120, 'sci', 'Tư duy khoa học')

  all_scores <- list(res_vi$scores, res_en$scores, res_mth$scores, res_sci$scores) %>% purrr::reduce(~ dplyr::full_join(.x, .y, by = 'name'))
  readr::write_csv(all_scores, 'student_scores_2pl_ALL.csv')

  out <- list(students = all_scores, items = list(vi = res_vi$items, en = res_en$items, math = res_mth$items, sci = res_sci$items))
  return(out)
}

## main() retains CLI behavior: read stdin, call process_responses and print JSON
main <- function(){
  input_text <- tryCatch({ paste(readLines(file('stdin'), warn = FALSE), collapse = '\n') }, error = function(e) '')
  if (nchar(input_text) == 0) {
    cat(toJSON(list(error = 'no input'), auto_unbox=TRUE))
    return(invisible(NULL))
  }
  data <- fromJSON(input_text)
  if (is.null(data$responses)) {
    cat(toJSON(list(error = 'missing responses field'), auto_unbox=TRUE))
    return(invisible(NULL))
  }
  out <- tryCatch({ process_responses(data) }, error = function(e) list(error = paste0('R runtime error: ', e$message)))
  cat(toJSON(out, dataframe = 'rows', auto_unbox = TRUE))
}

safe_is_cli <- function(){
  # Simple CLI detection: run main only when R was invoked with --file=irt_run.R
  args <- commandArgs(trailingOnly = FALSE)
  file_args <- args[grepl("--file=", args)]
  if (length(file_args) == 0) return(FALSE)
  any(basename(sub("--file=", "", file_args)) == "irt_run.R")
}

if (safe_is_cli()){
  tryCatch({ main() }, error = function(e) { cat(toJSON(list(error = paste0('R runtime error: ', e$message)), auto_unbox=TRUE)) })
  quit(status = 0)
}
