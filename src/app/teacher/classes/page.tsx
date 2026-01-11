'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TeacherClasses() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [courses, setCourses] = useState([]);
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
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading courses:', err);
        setLoading(false);
      });
  }, [user, isLoaded, router]);

  if (!isLoaded || loading) return <LoadingSpinner text="Loading your classes..." />;

  const role = user?.publicMetadata?.role as string;
  if (!user || !role || role !== 'teacher') {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Your Classes</h1>
          <p className="text-sm text-muted-foreground">Manage all your courses and assignments here.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course: any) => (
          <Link
            key={course._id}
            href={`/teacher/classes/${course._id}`}
            className="block border border-border bg-white p-5 shadow-sm transition hover:bg-muted"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{course.name}</h3>
              <span className="mono-emph bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                {course.code}
              </span>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{course.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{course.studentCount || 0} students</span>
              <span>{course.assignmentCount || 0} assignments</span>
            </div>
          </Link>
        ))}

        {courses.length === 0 && (
          <div className="col-span-full border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No classes yet. They'll appear here once you're enrolled.</p>
          </div>
        )}
      </div>
    </div>
  );
}
