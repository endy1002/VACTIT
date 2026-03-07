'use client';
import React, { useEffect, useState, useRef } from "react";
import ExamContainer from "@/components/exam/ExamContainer";
import { api } from "@/lib/api-client";
import Loading from "./loading";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/swr-hooks";

type Params = Promise<{ testId: string }>


export default function ExamPage(props: {
  params: Params;
}) {
  const params = React.use(props.params)
  const testId = params.testId
  const [pages, setPages] = useState<string[]>([]);
  const [trialData, setTrialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasChecked = useRef(false);
  const { userId, isLoading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (userLoading) return;
    if (!userId) {
      setLoading(false);
      router.replace('/auth/login');
      return;
    }
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
      api.trials.getById(`${testId}?userId=${encodeURIComponent(userId)}`)
    ])
      .then(([pagesRes, trialRes]) => {
        setPages(pagesRes.pages || []);
        setTrialData(trialRes.data);
      })
      .catch((err) => {
        const msg = (err as Error)?.message?.toLowerCase?.() || '';
        console.log("Error fetching exam data:", msg);

        if (msg.includes('forbidden') || msg.includes('403') || msg.includes('already_submitted')) {
          setLoading(false);
          console.log("Access denied to this test. Redirecting to overview.");
          router.replace('/overview');
          // Fallback in case router navigation is blocked
          if (typeof window !== 'undefined') {
            window.location.href = '/overview';
          }
          return;
        }
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
        });
      }, [testId, router, userId, userLoading]);

  if (loading) {
    return <Loading></Loading>
  }


  return (
    <div className="min-h-screen flex flex-col h-screen">
      <main className="flex-1 overflow-hidden bg-gray-50">
        <ExamContainer
          testId={testId}
          initialPages={pages}
          testTitle={trialData?.test?.title}
          durationMinutes={trialData?.test?.duration}
          realTestId={trialData?.test?.test_id}
          trialType={trialData?.test?.type}
          
        />
      </main>
    </div>
  )
}

