'use client';

import { useState } from 'react';
import { InterviewModal } from '@/components/interviews/InterviewModal';
import { Button } from '@/components/ui/button';

interface SubmissionFormProps {
  assignmentId: string;
  studentId: string;
}

export function SubmissionForm({ assignmentId, studentId }: SubmissionFormProps) {
  const [submissionText, setSubmissionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showInterview, setShowInterview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, studentId, submissionText })
      });

      const data = await response.json();
      setResult(data);

      if (data.needsInterview) {
        setShowInterview(true);
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 text-foreground">
        <textarea
          value={submissionText}
          onChange={(e) => setSubmissionText(e.target.value)}
          required
          rows={12}
          className="w-full border border-border bg-white px-3 py-3 text-sm"
          placeholder="Type your response..."
        />

        <Button
          type="submit"
          disabled={loading}
          className="h-10 bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
      </form>

      {result && !showInterview && (
        <div className="mt-4 border border-border bg-card px-4 py-3 text-sm text-foreground">
          <p className="font-semibold">
            Submitted.
          </p>
        </div>
      )}

      {showInterview && (
        <InterviewModal
          assignmentId={assignmentId}
          submissionId={result.submissionId}
          submissionText={submissionText}
          onClose={() => setShowInterview(false)}
        />
      )}
    </>
  );
}
