'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ClassDetail() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
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

    Promise.all([
      fetch(`/api/courses/${params.id}`).then(r => r.json()),
      fetch(`/api/courses/${params.id}/assignments`).then(r => r.json()),
    ]).then(([courseData, assignmentsData]) => {
      setCourse(courseData.course);
      setAssignments(assignmentsData.assignments || []);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading course:', err);
      setLoading(false);
    });
  }, [params.id, user, isLoaded, router]);

  if (loading) return <LoadingSpinner text="Loading..." />;
  if (!course) return <div className="p-6">Class not found.</div>;

  const role = user?.publicMetadata?.role as string;
  if (!user || !role || role !== 'teacher') {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 text-foreground">
      <Link href="/teacher/classes" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-semibold leading-tight">{course.name}</h1>
            <span className="mono-emph bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
              {course.code}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{course.description}</p>
        </div>
      </div>

      <div className="mb-6 border border-border bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assignments</h2>
          <Button
            asChild
            className="h-9 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Link href={`/teacher/assignments/new?courseId=${params.id}`}>New</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {assignments.map((assignment: any) => (
          <div key={assignment._id} className="border border-border bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{assignment.title}</h3>
                {assignment.description && (
                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                  <span>{assignment.submissionCount || 0} submissions</span>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="h-9 border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-muted"
              >
                <Link href={`/teacher/assignments/${assignment._id}`}>View details</Link>
              </Button>
            </div>
          </div>
        ))}

        {assignments.length === 0 && (
          <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No assignments yet. Click "New assignment" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
