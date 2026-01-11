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
  const [isGrading, setIsGrading] = useState(false);
  const [gradeData, setGradeData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
            <h1 className="text-3xl font-semibold leading-tight">Review</h1>
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
              Flagged
            </span>
          )}
        </div>
      </div>

      {submission.suspicionScore > 0 && (
        <div className="mb-6 border border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Concerns detected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {submission.suspicionScore} indicator{submission.suspicionScore > 1 ? 's' : ''} found that suggest possible AI use or plagiarism.
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
          <p className="text-sm text-muted-foreground">Score</p>
          <p className="mono-emph text-2xl font-semibold text-secondary">
            {submission.score !== null && submission.score !== undefined ? `${submission.score}/${assignment?.maxScore || 100}` : 'Pending'}
          </p>
        </div>
        <div className={`border p-4 shadow-sm ${submission.needsInterview && !submission.interviewCompleted ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
          <p className="text-sm text-muted-foreground">Interview</p>
          <p className={`mono-emph text-2xl font-semibold ${submission.needsInterview && !submission.interviewCompleted ? 'text-primary' : 'text-foreground'}`}>
            {submission.interviewCompleted ? 'Done' : submission.needsInterview ? 'Needed' : 'No'}
          </p>
        </div>
      </div>

      <div className="mb-6 border border-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Response</h2>
        {submission.submittedText ? (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-foreground">{submission.submittedText}</p>
          </div>
        ) : submission.submittedFileUrl ? (
          <div className="text-sm text-muted-foreground">
            <p>File: {submission.submittedFileUrl}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Empty response.</p>
        )}
      </div>

      {submission.feedback && (
        <div className="mb-6 border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold">Feedback</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{submission.feedback}</p>
        </div>
      )}

      {assignment?.rubric && (
        <div className="mb-6 border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Grading</h2>
            {!isGrading && (
              <Button
                onClick={async () => {
                  setIsGrading(true);
                  // Fetch auto-grade if available
                  try {
                    const res = await fetch(`/api/submissions/${params.id}/grade`);
                    const data = await res.json();
                    if (data.autoGrade) {
                      setGradeData(data.autoGrade);
                    } else if (submission.manualGrade) {
                      setGradeData(submission.manualGrade);
                    } else {
                      // Initialize with zeros
                      setGradeData({
                        criteria: assignment.rubric.map((item: any) => ({
                          criterionId: item.id,
                          criterion: item.criterion,
                          maxPoints: item.maxPoints,
                          pointsEarned: 0,
                          justification: ''
                        }))
                      });
                    }
                  } catch (err) {
                    console.error('Failed to load grade:', err);
                  }
                }}
                variant="outline"
                className="border-border bg-white px-6 text-sm font-semibold text-foreground hover:bg-muted"
              >
                {submission.score !== null && submission.score !== undefined ? 'Edit Grade' : 'Grade Submission'}
              </Button>
            )}
          </div>

          {isGrading && gradeData && (
            <div className="space-y-4">
              {gradeData.criteria.map((item: any, index: number) => {
                const rubricItem = assignment.rubric.find((r: any) => r.id === item.criterionId);
                return (
                  <div key={index} className="border border-border p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{rubricItem?.criterion || item.criterion}</p>
                        <p className="text-sm text-muted-foreground">{rubricItem?.description}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={rubricItem?.maxPoints || item.maxPoints}
                          value={item.pointsEarned}
                          onChange={(e) => {
                            const newCriteria = [...gradeData.criteria];
                            newCriteria[index].pointsEarned = parseInt(e.target.value) || 0;
                            setGradeData({ ...gradeData, criteria: newCriteria });
                          }}
                          className="w-16 border border-border px-2 py-1 text-center"
                        />
                        <span className="text-sm text-muted-foreground">/ {rubricItem?.maxPoints || item.maxPoints}</span>
                      </div>
                    </div>
                    <textarea
                      placeholder="Feedback (optional)"
                      value={item.justification || ''}
                      onChange={(e) => {
                        const newCriteria = [...gradeData.criteria];
                        newCriteria[index].justification = e.target.value;
                        setGradeData({ ...gradeData, criteria: newCriteria });
                      }}
                      className="mt-2 w-full border border-border p-2 text-sm"
                      rows={2}
                    />
                  </div>
                );
              })}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Score</p>
                  <p className="text-2xl font-bold">
                    {gradeData.criteria.reduce((sum: number, c: any) => sum + (c.pointsEarned || 0), 0)} / {assignment.maxScore || 100}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsGrading(false);
                      setGradeData(null);
                    }}
                    variant="outline"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const totalScore = gradeData.criteria.reduce((sum: number, c: any) => sum + (c.pointsEarned || 0), 0);
                        const res = await fetch(`/api/submissions/${params.id}/manual-grade`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            criteria: gradeData.criteria,
                            totalScore,
                            teacherId: user?.id
                          })
                        });
                        if (res.ok) {
                          setSubmission({ ...submission, score: totalScore, manualGrade: gradeData });
                          setIsGrading(false);
                        }
                      } catch (err) {
                        console.error('Failed to save grade:', err);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                        Saving...
                      </span>
                    ) : (
                      'Save Grade'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isGrading && (submission.manualGrade || submission.autoGrade) && (
            <div className="space-y-2">
              {(submission.manualGrade?.criteria || submission.autoGrade?.criteria || []).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm">{item.criterion}</span>
                  <span className="font-semibold">{item.pointsEarned} / {item.maxPoints}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
