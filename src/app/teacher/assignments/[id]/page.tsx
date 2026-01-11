'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function AssignmentDetail() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(newStatus === 'deleted' ? 'Are you sure you want to delete this assignment?' : `Are you sure you want to ${newStatus === 'open' ? 'show' : 'hide'} this assignment?`)) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/assignments/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      if (newStatus === 'deleted') {
        router.push(`/teacher/classes/${assignment.courseId}`);
      } else {
        setAssignment({ ...assignment, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

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

    // Fetch assignment details
    fetch(`/api/assignments/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setAssignment(data.assignment);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading assignment:', err);
        setLoading(false);
      });

    // Fetch submissions for this assignment
    fetch(`/api/assignments/${params.id}/submissions`)
      .then(res => res.json())
      .then(data => {
        setSubmissions(data.submissions || []);
      })
      .catch(err => {
        console.error('Error loading submissions:', err);
      });
  }, [params.id, user, isLoaded, router]);

  if (loading) return <LoadingSpinner text="Loading assignment details..." />;
  if (!assignment) return <div className="p-6">Assignment not found.</div>;

  const role = user?.publicMetadata?.role as string;
  if (!user || !role || role !== 'teacher') {
    return <div className="p-6">Redirecting...</div>;
  }

  const flaggedSubmissions = submissions.filter(s => s.needsInterview && !s.interviewCompleted);
  const gradedSubmissions = submissions.filter(s => s.score !== null && s.score !== undefined);
  const totalPoints = assignment.totalPoints || assignment.maxScore || 100;

  return (
    <div className="mx-auto max-w-6xl p-6 text-foreground">
      <div className="mb-6">
        <Link href="/teacher" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to portal
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">{assignment.title}</h1>
            {assignment.description && (
              <p className="mt-2 text-muted-foreground">{assignment.description}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
              <span>Total points: {totalPoints}</span>

              <span>{submissions.length} submissions</span>
              {assignment.status === 'hidden' && (
                <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                  Hidden
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row">
            <Button
              asChild
              variant="outline"
              className="h-10 border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Link href={`/teacher/assignments/${params.id}/rubric`}>Edit rubric</Link>
            </Button>
            <Button
              variant="outline"
              disabled={updating}
              onClick={() => handleStatusChange(assignment.status === 'hidden' ? 'open' : 'hidden')}
              className="h-10 border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              {assignment.status === 'hidden' ? 'Show Assignment' : 'Hide Assignment'}
            </Button>
            <Button
              variant="destructive"
              disabled={updating}
              onClick={() => handleStatusChange('deleted')}
              className="h-10 px-4 text-sm font-semibold"
            >
              Delete Assignment
            </Button>
            <Button
              asChild
              className="h-10 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Link href={`/api/assignments/${params.id}/pdf`}>Download PDF</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total submissions</p>
          <p className="mono-emph text-3xl font-semibold text-foreground">{submissions.length}</p>
          <p className="text-xs text-foreground">Students responded</p>
        </div>
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Flagged for review</p>
          <p className="mono-emph text-3xl font-semibold text-destructive">{flaggedSubmissions.length}</p>
          <p className="text-xs text-foreground">Need attention</p>
        </div>
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Graded</p>
          <p className="mono-emph text-3xl font-semibold text-secondary">{gradedSubmissions.length}</p>
          <p className="text-xs text-foreground">Complete</p>
        </div>
      </div>

      <div className="border border-border bg-white px-5 py-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Submissions</h2>

        <div className="space-y-3">
          {submissions.map((submission: any) => (
            <div
              key={submission._id}
              className="border border-border bg-card px-4 py-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">Student {submission.studentId.slice(-6)}</p>
                    {submission.needsInterview && !submission.interviewCompleted && (
                      <span className="bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
                        Flagged
                      </span>
                    )}
                    {submission.score !== null && submission.score !== undefined && (
                      <span className="bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                        {submission.score}/{assignment.maxScore}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                  {submission.suspicionScore > 0 && (
                    <p className="mt-1 text-xs text-destructive">
                      Suspicion score: {submission.suspicionScore} indicators found
                    </p>
                  )}
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="h-8 border-border bg-white px-3 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <Link href={`/teacher/submissions/${submission._id}`}>Review</Link>
                </Button>
              </div>
            </div>
          ))}

          {submissions.length === 0 && (
            <div className="border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              No submissions yet. Students will see this assignment and can submit their work.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 border border-border bg-card px-5 py-4">
        <h3 className="mb-3 font-semibold">Assignment Instructions</h3>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{assignment.instructions}</p>
      </div>
    </div>
  );
}
