'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function SubmissionReview() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const [submission, setSubmission] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/');
      return;
    }

    const role = user.publicMetadata?.role as string;

    if (!role) {
      router.push('/onboarding');
      return;
    }

    if (role !== 'teacher') {
      router.push('/student');
      return;
    }

    if (!params.id) return;

    // Fetch submission details
    fetch(`/api/submissions/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setSubmission(data.submission);
        if (data.submission?.assignmentId) {
          return fetch(`/api/assignments/${data.submission.assignmentId}`);
        }
      })
      .then(res => res?.json())
      .then(data => {
        if (data) setAssignment(data.assignment);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading submission:', err);
        setLoading(false);
      });
  }, [params.id, user, isLoaded, router]);

  if (loading) return <LoadingSpinner text="Loading submission..." />;
  if (!submission) return <div className="p-6">Submission not found.</div>;

  const role = user?.publicMetadata?.role as string;
  if (!user || !role || role !== 'teacher') {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 text-foreground">
      <div className="mb-6">
        <Link 
          href={assignment ? `/teacher/assignments/${assignment._id}` : '/teacher'} 
          className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to assignment
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">Submission Review</h1>
            {assignment && (
              <p className="mt-2 text-muted-foreground">{assignment.title}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Student {submission.studentId.slice(-6)}</span>
              <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>
          {submission.needsInterview && !submission.interviewCompleted && (
            <span className="bg-destructive px-3 py-1 text-sm font-semibold text-white">
              Flagged for Review
            </span>
          )}
        </div>
      </div>

      {submission.suspicionScore > 0 && (
        <div className="mb-6 border border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Integrity Concerns Detected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {submission.suspicionScore} indicator{submission.suspicionScore > 1 ? 's' : ''} found that suggest possible AI assistance or plagiarism.
              </p>
              <div className="mt-3 space-y-2">
                {submission.indicatorsFound?.map((indicator: any, index: number) => (
                  <div key={index} className="border-l-2 border-destructive pl-3">
                    <p className="text-sm font-semibold">{indicator.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                    <p className="text-sm text-muted-foreground">"{indicator.evidence}"</p>
                    <p className="text-xs text-muted-foreground">Location: {indicator.location}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mono-emph text-2xl font-semibold text-foreground capitalize">{submission.status}</p>
        </div>
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Current Score</p>
          <p className="mono-emph text-2xl font-semibold text-secondary">
            {submission.score !== null && submission.score !== undefined ? `${submission.score}/${assignment?.maxScore || 100}` : 'Not graded'}
          </p>
        </div>
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Interview Status</p>
          <p className="mono-emph text-2xl font-semibold text-foreground">
            {submission.interviewCompleted ? 'Complete' : submission.needsInterview ? 'Needed' : 'Not required'}
          </p>
        </div>
      </div>

      <div className="mb-6 border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Student Response</h2>
        {submission.submittedText ? (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-foreground">{submission.submittedText}</p>
          </div>
        ) : submission.submittedFileUrl ? (
          <div className="text-sm text-muted-foreground">
            <p>File submitted: {submission.submittedFileUrl}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No response text available.</p>
        )}
      </div>

      {submission.feedback && (
        <div className="mb-6 border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold">Feedback</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{submission.feedback}</p>
        </div>
      )}

      <div className="flex gap-3">
        {submission.needsInterview && !submission.interviewCompleted && (
          <Button className="bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Schedule Interview
          </Button>
        )}
        {(!submission.score && submission.score !== 0) && (
          <Button variant="outline" className="border-border bg-white px-6 text-sm font-semibold text-foreground hover:bg-muted">
            Grade Submission
          </Button>
        )}
      </div>
    </div>
  );
}
