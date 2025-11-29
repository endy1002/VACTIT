import React from 'react';

type Question = { id: number; text?: string; options: string[] };

export default function AnswerPanel({
  questions,
  answers,
  onSelect,
  onSubmit,
  onClear,
  flags,
  onToggleFlag,
}: {
  questions: Question[];
  answers: Record<number, string>;
  onSelect: (qid: number, value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  flags?: Record<number, boolean>;
  onToggleFlag?: (qid: number) => void;
}) {

  const divider = "border-b-2"

  return (
    <aside className="w-96 bg-white border max-h-screen py-4 rounded-md shadow-sm flex flex-col">
      {/* header with simple tabs */}
      <div className="border-b flex items-center justify-between px-4 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-0.5 flex items-center">
            <button className="px-3 py-1 rounded-full bg-white text-sm font-medium">Điền đáp án</button>
          </div>
          <div className="text-xs text-gray-400 ml-2"> </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSubmit}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
            aria-label="Nộp bài"
          >
            Nộp bài
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-screen px-4">
        <div className="">
          {questions.map((q, idx) => (
            <div key={q.id} className={`px-1 py-3 flex items-center justify-between ${((idx+1) % 5 === 0 ? divider : '')}`}>
              <div className="w-12 flex-shrink-0 text-sm text-gray-600 font-medium">{q.id}</div>

              <div className="flex-1 px-2">
                <div className="flex justify-between items-center px-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => onSelect(q.id, opt)}
                        aria-pressed={selected}
                        className={
                          'flex items-center justify-center w-9 h-9 rounded-full border transition-colors text-sm ' +
                          (selected
                            ? 'bg-blue-600 border-blue-600 text-white shadow'
                            : 'bg-white border-blue-200 text-blue-600')
                        }
                        title={`Câu ${q.id}: ${opt}`}
                      >
                        <span className="text-xs font-semibold">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* footer actions */}
      {/* <div className="mt-3 flex items-center gap-2">
        <button onClick={onClear} className="flex-1 border py-2 rounded text-sm">
          Xóa đáp án
        </button>
        <button onClick={onSubmit} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm">
          Nộp bài
        </button>
      </div> */}
    </aside>
  );
}