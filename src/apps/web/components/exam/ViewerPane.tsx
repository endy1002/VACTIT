import Image from "next/image";
import Timer from "./Timer";

type ViewerPaneProps = {
  pages: string[];
  pdfUrl?: string;
  zoom: number;
  testData?: { title: string; durationSeconds: number; testId: string };
  startAt?: number;
  onExpire?: () => void;
  onExit?: () => void;
};

export default function ViewerPane({ pages, pdfUrl, zoom, testData, startAt, onExpire, onExit }: ViewerPaneProps) {
  return (
    <div className="flex-[2] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header with timer, title, and exit button */}
      {testData && (
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          {/* Left: Timer */}
          <div className="flex items-center">
            <Timer
              startAt={startAt || Date.now()}
              durationSeconds={testData.durationSeconds}
              testId={testData.testId}
              onExpire={onExpire}
            />
          </div>
          
          {/* Center: Title */}
          <div className="flex-1 text-center">
            <h3 className="text-xl font-semibold text-gray-700 truncate px-4">
              {testData.title}
            </h3>
          </div>
          
          {/* Right: Exit Button */}
          <button
            type="button"
            onClick={onExit}
            className="px-7 py-2 text-sm font-[450] text-black bg-[#F1F6FF] border border-gray-300 rounded-lg hover:bg-[#2864D2] hover:text-white transition-colors cursor-pointer"
          >
            Rời bài thi
          </button>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col items-center gap-4">
          {pdfUrl ? (
            <div className="w-full max-w-5xl">
              <div className="w-full h-[75vh] bg-white border border-gray-200 shadow-sm overflow-hidden">
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                  className="w-full h-full bg-white"
                  title="Exam PDF"
                  loading="lazy"
                  style={{ backgroundColor: '#fff' }}
                />
              </div>
            </div>
          ) : pages.length === 0 ? (
            <div className="text-gray-500 py-10">Không tìm thấy đề thi.</div>
          ) : (
            pages.map((src, idx) => (
              <div key={idx} className="w-full max-w-3xl">
                <Image
                  width={800}
                  height={1280}
                  src={src}
                  alt={`Trang ${idx + 1}`}
                  loading="lazy"
                  unoptimized
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                  className="w-full h-auto bg-white shadow-xl rounded border border-gray-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ))
          )}

          {/*
          Legacy image rendering preserved by request:
          {pages.length === 0 ? (
            <div className="text-gray-500 py-10">Không tìm thấy đề thi.</div>
          ) : (
            pages.map((src, idx) => (
              <div key={idx} className="w-full max-w-3xl">
                <Image
                  width={800}
                  height={1280}
                  src={src}
                  alt={`Trang ${idx + 1}`}
                  loading="lazy"
                  unoptimized
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                  className="w-full h-auto bg-white shadow-xl rounded border border-gray-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ))
          )}
          */}
        </div>
      </div>
    </div>
  );
}