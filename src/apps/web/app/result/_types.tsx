export const TOTAL_QUESTIONS = 120;

export type TrialListItem = {
  trial_id: string;
  test_id: string;
  start_time: string;
  end_time: string;
  raw_score: any;
  processed_score: any;
  test?: {
    test_id: string;
    title: string;
    type: string;
    duration: number | null;
    due_time: string | null;
  };
  _count?: { responses: number };
};

export type StudentTrialsRes = {
  data: TrialListItem[];
  count: number;
};

export type TrialDetails = {
  trial_id: string;
  test: { test_id: string; title: string; duration: number | null; type: "practice" | "exam" };
  tactic: unknown | null;
  responses: Array<{
    question_id: string;
    chosen_option: string | null;
    response_time: number;
    question?: {
      correct_option: string | null;
    };
  }>;
};

export type SubjectSummary = {
  id: string;
  title: string;
  correct: number;
  score0_300?: number;
};
