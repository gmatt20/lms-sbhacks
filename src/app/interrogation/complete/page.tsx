'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function InterviewCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const submissionId = searchParams.get('submissionId');
  
  const [honestyScore, setHonestyScore] = useState<number | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setError('Missing submission ID');
      setLoadingScore(false);
      return;
    }

    const fetchScore = async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}`);
        const data = await res.json();
        if (data.submission?.honestyScore !== undefined) {
          setHonestyScore(data.submission.honestyScore);
        }
      } catch (err) {
        console.error('Failed to fetch honesty score:', err);
        setError('Failed to load score');
      } finally {
        setLoadingScore(false);
      }
    };

    fetchScore();
  }, [submissionId]);

  if (!submissionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md border border-border bg-white p-4 shadow-sm">
          <p className="text-muted-foreground">Missing submission ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="border border-border bg-white rounded-lg p-8 text-center shadow-sm">
          <p className="text-3xl font-bold text-foreground mb-3">✓ Interview Complete</p>
          <p className="text-muted-foreground mb-8">Your responses have been recorded and will be reviewed.</p>
          
          {/* Honesty Score */}
          {loadingScore ? (
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Calculating score...</span>
            </div>
          ) : error ? (
            <div className="mb-8 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : honestyScore !== null ? (
            <div className="mb-8 p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Verification Score</p>
              <p className="text-5xl font-bold text-foreground">{Math.round(honestyScore * 100)}%</p>
            </div>
          ) : null}
          
          <Button onClick={() => router.push('/student')} className="bg-green-600 hover:bg-green-700 text-white h-12 px-8">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
