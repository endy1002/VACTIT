// Hàm helper để random dữ liệu
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const SUBJECTS = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'GDCD', 'ĐGNL'];
const TITLES = [
  'Đề thi thử THPT Quốc gia 2025 - Trường THPT Chuyên KHTN',
  'Đề khảo sát chất lượng đầu năm lớp 12 - Sở GD&ĐT Hà Nội',
  'Tổng hợp câu hỏi trắc nghiệm ĐGNL đợt 1',
  'Đề thi thử lần 1 - Trường THPT Chuyên Sư Phạm',
  'Bộ đề ôn tập kĩ năng đọc hiểu Ngữ Văn',
  'Tuyển tập 50 câu vận dụng cao Hàm số',
  'Đề thi thử đánh giá tư duy Đại học Bách Khoa',
];

const DESCRIPTIONS = [
  "Đề thi bao gồm các câu hỏi bám sát cấu trúc đề minh họa của Bộ GD&ĐT. Nội dung kiến thức tập trung vào chương trình lớp 12 và các chuyên đề trọng tâm lớp 11.",
  "Bài thi đánh giá năng lực tư duy, bao gồm 3 phần: Tư duy định lượng, Tư duy định tính và Khoa học. Thí sinh cần vận dụng linh hoạt kiến thức để giải quyết vấn đề.",
  "Đề khảo sát chất lượng giúp học sinh rà soát lại kiến thức đã học, phát hiện các lỗ hổng kiến thức để có kế hoạch ôn tập phù hợp cho kỳ thi sắp tới.",
  "Tổng hợp các dạng bài tập vận dụng và vận dụng cao, phù hợp cho học sinh khá giỏi muốn chinh phục điểm 9, 10 trong kỳ thi THPT Quốc gia.",
  "Đề thi được biên soạn bởi đội ngũ giáo viên giàu kinh nghiệm, cập nhật các xu hướng ra đề mới nhất năm 2025."
];

const INSTRUCTIONS = [
  "Bước 1: Chuẩn bị giấy nháp, bút viết và máy tính cầm tay (nếu cần).\nBước 2: Đảm bảo kết nối internet ổn định trong suốt quá trình làm bài.\nBước 3: Không thoát khỏi màn hình làm bài quá 3 lần, nếu không hệ thống sẽ tự động nộp bài.",
  "Bước 1: Đọc kỹ hướng dẫn trước khi bắt đầu.\nBước 2: Phân bổ thời gian hợp lý cho từng phần thi.\nBước 3: Kiểm tra lại các đáp án đã chọn trước khi bấm nộp bài.",
  "Bước 1: Đăng nhập vào hệ thống đúng giờ.\nBước 2: Làm bài nghiêm túc, không gian lận.\nBước 3: Hệ thống sẽ tự động lưu bài làm sau mỗi câu trả lời.",
  "Bước 1: Chọn không gian yên tĩnh để làm bài.\nBước 2: Tắt các ứng dụng nhắn tin, thông báo để tập trung.\nBước 3: Bấm 'Nộp bài' khi đã hoàn thành để xem kết quả và lời giải chi tiết."
];

// Tạo 50 đề thi giả lập với dữ liệu chi tiết
export const MOCK_EXAMS = Array.from({ length: 50 }).map((_, index) => ({
  id: index + 1,
  date: `${getRandomInt(1, 28)}/${getRandomInt(1, 12)}/2025`,
  isVip: Math.random() < 0.2,
  title: `${getRandomItem(SUBJECTS)} - ${getRandomItem(TITLES)}`,
  views: `${getRandomInt(1, 100)}.${getRandomInt(100, 999)}`,
  duration: getRandomItem(['45', '60', '90', '120', '150']),
  status: getRandomItem(['chua-lam', 'da-lam', 'dang-lam']),
  // Dữ liệu mô tả và hướng dẫn riêng cho từng bài
  description: getRandomItem(DESCRIPTIONS),
  instructions: getRandomItem(INSTRUCTIONS)
}));