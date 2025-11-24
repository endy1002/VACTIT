'use client';

import React, { useState } from 'react';

import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';
import OverviewTab from '../components/dashboard/tabs/OverviewTab';
import ExamTab from '../components/dashboard/tabs/ExamTab';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Hàm render nội dung dựa trên tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'exam':
        return <ExamTab />;
      // Các case khác sẽ được thêm vào sau khi bạn tạo component tương ứng
      case 'result':
      case 'leaderboard':
      case 'teachers':
      case 'guide':
      case 'faq':
      case 'news':
      case 'settings':
      default:
        return (
          <div className="flex items-center justify-center h-[50vh] text-gray-400">
            Nội dung tab "{activeTab}" đang phát triển...
          </div>
        );
    }
  };

  return (
    <div className="app-root">
      {/* Sidebar nằm bên trái */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main bg-gray-50 min-h-screen">
        {/* Topbar nằm trên cùng của phần main */}
        <Topbar />

        {/* Nội dung chính thay đổi dynamic */}
        <main className="content p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}