'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TeacherDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ totalAssignments: 0, totalSubmissions: 0, pendingReviews: 0 });
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

    fetch(`/api/courses?teacherId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setCourses(data.courses || []);
        setStats(data.stats || stats);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching courses:', err);
        setLoading(false);
      });
  }, [user, isLoaded, router]);

  if (!isLoaded || !user || loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const role = user.publicMetadata?.role as string;
  if (!role || role !== 'teacher') {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">My Portal</h1>
          <p className="text-sm text-muted-foreground">Manage your courses, assignments, and monitor student work.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Active courses</p>
          <p className="mono-emph text-3xl font-semibold text-foreground">{courses.length}</p>
          <p className="text-xs text-foreground">This semester</p>
        </div>
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total assignments</p>
          <p className="mono-emph text-3xl font-semibold text-secondary">{stats.totalAssignments}</p>
          <p className="text-xs text-foreground">All your classes</p>
        </div>
        <div className="border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Pending checks</p>
          <p className="mono-emph text-3xl font-semibold text-destructive">{stats.pendingReviews}</p>
          <p className="text-xs text-foreground">Need attention</p>
        </div>
      </div>

      <div className="border border-border bg-white px-5 py-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your classes</h2>
          <Button asChild className="h-9 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Link href="/teacher/classes">View all</Link>
          </Button>
        </div>

        <div className="space-y-3">
          {courses.slice(0, 4).map((course: any) => (
            <Link
              key={course._id}
              href={`/teacher/classes/${course._id}`}
              className="flex items-center justify-between border border-border bg-card px-4 py-3 transition hover:bg-muted"
            >
              <div>
                <h3 className="font-semibold">{course.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {course.code} • {course.studentCount || 0} students
                </p>
              </div>
              <span className="text-xs font-semibold text-secondary">{course.assignmentCount || 0} assignments</span>
            </Link>
          ))}

          {courses.length === 0 && (
            <div className="border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
              No classes found yet. Contact your administrator to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
