'use client';
import React, { useEffect, useState, useRef } from "react";
import ExamContainer from "@/components/exam/ExamContainer";
import { api } from "@/lib/api-client";
import Loading from "./loading";
import { useRouter } from "next/navigation";

type Params = Promise<{ testId: string }>


export default function ExamPage(props: {
  params: Params;
}) {
  const params = React.use(props.params)
  const testId = params.testId
  const [pages, setPages] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [trialData, setTrialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Prevent double execution (React Strict Mode)
    if (hasChecked.current) return;
    hasChecked.current = true;

    // Quick client-side check (can be bypassed, but prevents accidental back nav)
    const wasSubmitted = sessionStorage.getItem(`exam_cleared_${testId}`);
    if (wasSubmitted) {
      router.replace('/overview');
      return;
    }
    
    // Fetch exam data
    Promise.all([
      api.tests.getPages(testId),
      api.trials.getById(testId)
    ])
      .then(([pagesRes, trialRes]) => {
        setPages(pagesRes.pages || []);
        setPdfUrl(pagesRes.pdfUrl || null);
        setTrialData(trialRes.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [testId, router]);

  if (loading) {
    return <Loading></Loading>
  }


  return (
    <div className="min-h-screen flex flex-col h-screen">
      <main className="flex-1 overflow-hidden bg-gray-50">
        <ExamContainer
          testId={testId}
          initialPages={pages}
          initialPdfUrl={pdfUrl || undefined}
          testTitle={trialData?.test?.title}
          durationMinutes={trialData?.test?.duration}
          realTestId={trialData?.test?.test_id}
        />
      </main>
    </div>
  )
}

