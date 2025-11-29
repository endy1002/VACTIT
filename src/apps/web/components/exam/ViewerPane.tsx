import React from 'react';

export default function ViewerPane({ src, zoom }: { src: string | null; zoom: number }) {
  return (
    <div className="w-full bg-gray-50 rounded p-4 flex justify-center">
      {src ? (
        <img
          src={src}
          alt="Exam page"
          loading="lazy"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            maxWidth: '100%',
            height: 'auto',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="text-gray-500">No pages found.</div>
      )}
    </div>
  );
}