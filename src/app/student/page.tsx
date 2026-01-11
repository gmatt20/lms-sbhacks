'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
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

    if (role !== 'student') {
      router.push('/teacher');
      return;
    }

    fetch(`/api/assignments?studentId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setAssignments(data.assignments);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading assignments:', err);
        setLoading(false);
      });
  }, [user, isLoaded, router]);

  if (!isLoaded || !user || loading) {
    return <LoadingSpinner text="Loading your assignments..." />;
  }

  const role = user.publicMetadata?.role as string;
  if (!role || role !== 'student') {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">My Portal</h1>
          <p className="text-sm text-muted-foreground">View your assignments, submit work, and stay organized.</p>
        </div>
      </div>

      <div className="space-y-3">
        {assignments.map((assignment: any) => (
          <Link
            key={assignment._id}
            href={`/student/${assignment._id}`}
            className={`flex items-center justify-between border px-4 py-3 transition ${assignment.isSubmitted
                ? 'border-border/50 bg-muted/50 opacity-60 hover:bg-muted'
                : 'border-border bg-white hover:bg-muted'
              }`}
          >
            <div>
              <h3 className="text-lg font-semibold">{assignment.title}</h3>
              <p className="text-xs text-muted-foreground">
                Assigned: {new Date(assignment.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`text-xs font-semibold ${assignment.isSubmitted ? 'text-muted-foreground' : 'text-secondary'}`}>
              {assignment.isSubmitted ? 'Submitted' : 'Open'}
            </span>
          </Link>
        ))}
        {assignments.length === 0 && (
          <div className="border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            No assignments yet. They will show up here when your teacher creates them.
          </div>
        )}
      </div>
    </div>
  );
}
