'use client';

import React, { useEffect, useState } from 'react';
import Topbar from '@/components/dashboard/Topbar';
import Sidebar from '@/components/dashboard/Sidebar';
import ViewerPane from '@/components/exam/ViewerPane';
import Controls from '@/components/exam/Controls';
import AnswerPanel from '@/components/exam/AnswerPanel';

type Question = {
  id: number;
  text?: string;
  options: string[];
};

type Params = Promise<{ testId: string }>

export default function ExamPage(props: {
  params: Params;
} ) {
  const params = React.use(props.params)
  const testId = params.testId
  const [pages, setPages] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<string>('exam'); // added for Sidebar

  useEffect(() => {
    setQuestions(
      Array.from({ length: 120 }).map((_, i) => ({
        id: i + 1,
        text: undefined,
        options: ['A', 'B', 'C', 'D'],
      }))
    );
  }, []);

  useEffect(() => {
   console.log(`Fetching pages for exam ${testId} from /api/exam/${testId}/pages`);
   fetch(`/api/exam/${testId}/pages`)
     .then(res => res.json())
     .then(data => {
       console.log('Fetched pages:', data);
       setPages(data.pages);
       setPageNumber(1);
       console.log(`Loaded ${data.pages.length} pages for exam ${testId}`);
     });
  }, [testId]);

  function handleSelect(qid: number, value: string) {
    setAnswers((s) => ({ ...s, [qid]: value }));
  }

  async function submitAnswers() {
  try {
    const res = await fetch('/api/exam/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, answers }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Failed: ${err.error}`);
      return;
    }

    alert('Submitted');
  } catch (err) {
    console.error(err);
    alert('Failed to submit');
  }
}


  return (
    <div className="min-h-screen flex">
        <main className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <Controls
              zoom={zoom}
              setZoom={setZoom}
              pageNumber={pageNumber}
              setPageNumber={setPageNumber}
              totalPages={pages.length}
              startAt={Date.now()} // replace with actual start time
              durationSeconds={3600} // replace with actual duration in seconds
              onExpire={() => { alert('Time is up! Submitting your exam.'); submitAnswers(); }}
            />

            <div className="flex gap-6 mt-4">
              <div className="flex-1">
                <ViewerPane src={pages[pageNumber - 1] ?? null} zoom={zoom} />
              </div>

              <AnswerPanel
                questions={questions}
                answers={answers}
                onSelect={handleSelect}
                onSubmit={() => { submitAnswers(); }}
                onClear={() => setAnswers({})}
              />
            </div>
          </div>
        </main>
    </div>
  );
}
