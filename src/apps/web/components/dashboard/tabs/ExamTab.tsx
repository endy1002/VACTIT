import React, { useState } from 'react';
// Import dữ liệu từ file cùng thư mục (sibling)
import { MOCK_EXAMS } from '../../../mockData/mockExam';

export default function ExamTab() {
  const [examSubTab, setExamSubTab] = useState('chua-lam');
  const [selectedExam, setSelectedExam] = useState<any | null>(null);

  return (
    <div className="exam-container fade-in flex flex-col h-[calc(100vh-140px)] relative">
      
      {/* 1. Header Banner */}
      <div className="w-full bg-white p-6 rounded-2xl shadow-sm mb-4 relative overflow-hidden flex-shrink-0 border border-gray-100">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            Kho Đề Thi <br /> ĐGNL & THPTQG
          </h1>
          <p className="text-gray-500 text-sm">
            Hơn 1000+ đề thi thử được cập nhật liên tục từ các trường chuyên và sở giáo dục trên cả nước.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none">
          <div className="absolute top-[-20px] right-[40px] w-20 h-20 bg-yellow-400 rounded-full opacity-90"></div>
          <div className="absolute bottom-[-10px] right-[100px] w-16 h-16 bg-yellow-400 rounded-full opacity-80"></div>
          <div className="absolute top-[40px] right-[-30px] w-32 h-32 bg-yellow-400 rounded-full opacity-100"></div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white p-3 rounded-xl shadow-sm mb-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0 border border-gray-100">
        <div className="flex gap-2 bg-blue-50 p-1 rounded-lg">
          {['chua-lam', 'da-lam', 'tong-hop'].map((tab) => (
            <button
              key={tab}
              onClick={() => setExamSubTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                examSubTab === tab
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:bg-white/50'
              }`}
            >
              {tab === 'chua-lam' ? 'Chưa làm' : tab === 'da-lam' ? 'Đã làm' : 'Tổng hợp'}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {['Mới nhất', 'Môn học', 'Độ khó'].map((label) => (
            <button
              key={label}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 bg-white hover:border-blue-400 transition-colors"
            >
              {label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Scrollable Grid Area */}
      <div className="flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {MOCK_EXAMS.map((exam) => (
            <div
              key={exam.id}
              className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full border border-gray-100 hover:border-blue-200 group relative"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded">
                  {exam.date}
                </span>
                <div className="flex gap-2">
                  {exam.isVip && (
                    <span className="bg-gray-900 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500 shadow-sm animate-pulse">
                      VIP
                    </span>
                  )}
                  <button className="text-gray-300 hover:text-blue-600 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Title */}
              <h3 
                className="text-gray-800 font-semibold text-sm mb-4 line-clamp-2 min-h-[40px] group-hover:text-blue-600 transition-colors cursor-pointer" 
                title={exam.title}
                onClick={() => setSelectedExam(exam)}
              >
                {exam.title}
              </h3>
              
              {/* Stats */}
              <div className="space-y-2 mb-4 border-t border-gray-50 pt-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span>{exam.views} lượt thi</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{exam.duration} phút</span>
                </div>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => setSelectedExam(exam)}
                  className="flex-1 py-2 text-xs text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  Chi tiết
                </button>
                <button className="flex-1 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 hover:shadow-blue-300 transform active:scale-95">
                  Thi ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MODAL CHI TIẾT ĐỀ THI */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedExam(null)}
          ></div>

          {/* Modal Container */}
          <div className="bg-white rounded-[2rem] w-full max-w-5xl relative z-10 overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
            
            {/* Header Deco */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none">
               <svg viewBox="0 0 200 200" className="w-full h-full text-yellow-400 fill-current opacity-100 transform translate-x-1/3 -translate-y-1/3"><circle cx="100" cy="100" r="80" /></svg>
               <svg viewBox="0 0 200 200" className="absolute top-10 right-10 w-32 h-32 text-yellow-300 fill-current opacity-80"><circle cx="100" cy="100" r="80" /></svg>
            </div>

            <div className="p-8 md:p-10 overflow-y-auto">
              
              {/* Modal Title */}
              <div className="mb-6 relative pr-20">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 leading-tight">
                  {selectedExam.title}
                </h2>
                <div className="flex gap-6 text-sm text-gray-600">
                   <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="font-medium">{selectedExam.views} lượt thi</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="font-medium">{selectedExam.duration} phút</span>
                   </div>
                </div>
              </div>

              {/* 2 Columns: Info & Guide */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                
                {/* Thông tin (Đã thêm thanh cuộn dọc) */}
                <div className="space-y-2">
                   <h3 className="text-blue-600 font-bold text-lg">Thông tin bài thi</h3>
                   <div className="bg-[#2563EB] text-white p-5 rounded-2xl h-48 overflow-y-auto overflow-x-hidden shadow-lg shadow-blue-200 custom-scrollbar-light">
                      <p className="text-sm leading-relaxed opacity-95 whitespace-pre-line">
                        {selectedExam.description || "Chưa có thông tin mô tả cho bài thi này."}
                      </p>
                   </div>
                </div>

                {/* Hướng dẫn (Đã fix: ẩn scroll ngang, giữ scroll dọc) */}
                <div className="space-y-2 relative">
                   <h3 className="text-blue-600 font-bold text-lg">Hướng dẫn thi</h3>
                   <div className="bg-[#2563EB] text-white p-5 rounded-2xl h-48 overflow-y-auto overflow-x-hidden shadow-lg shadow-blue-200 relative custom-scrollbar-light flex flex-col">
                      <div className="relative z-10">
                        <p className="text-sm leading-relaxed opacity-95 whitespace-pre-line">
                          {selectedExam.instructions || "Chưa có hướng dẫn cụ thể cho bài thi này."}
                        </p>
                      </div>
                      {/* Hình trang trí (sẽ bị cắt nếu tràn nhờ overflow-x-hidden) */}
                      <div className="absolute bottom-[-10px] right-[-10px] w-24 h-24 pointer-events-none opacity-50">
                         <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-400 transform rotate-12"><path d="M50 0 L100 50 L50 100 L0 50 Z" /></svg>
                      </div>
                   </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-auto">
                 <button className="w-full bg-[#2563EB] text-white py-4 rounded-full font-bold text-lg shadow-lg hover:bg-blue-700 transition-all hover:shadow-blue-300">
                    Vào thi ngay
                 </button>
                 <button 
                    onClick={() => setSelectedExam(null)}
                    className="w-full bg-gray-100 text-gray-600 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors"
                 >
                    Trở lại
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}