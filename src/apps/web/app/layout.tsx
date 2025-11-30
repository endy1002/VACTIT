import type { Metadata } from 'next';
import './globals.css';

// Import the permanent UI components here
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';

export const metadata: Metadata = {
  title: 'VACTIT',
  description: 'Web Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        
        {/* We move the main structure from page.tsx to here */}
        <div className="app-root flex min-h-screen">
          
          {/* Sidebar is now permanent. We removed the props because it will use URL routing now */}
          <Sidebar />

          <div className="main flex-1 flex flex-col bg-gray-50 min-h-screen">
            {/* Topbar is now permanent */}
            <Topbar />

            {/* {children} is where the specific page content (Overview, Exam) will appear */}
            <main className="content p-6">
              {children}
            </main>
          </div>
          
        </div>

      </body>
    </html>
  );
}