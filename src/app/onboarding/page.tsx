'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setUserRole } from '@/app/actions/user';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user already has a role, redirect to appropriate dashboard
    if (user?.publicMetadata?.role) {
      const role = user.publicMetadata.role as string;
      if (role === 'teacher') {
        router.push('/teacher');
      } else if (role === 'student') {
        router.push('/student');
      }
    }
  }, [user, router]);

  const handleRoleSelection = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);
    const result = await setUserRole(user.id, selectedRole);
    
    if (result.success) {
      // Reload to get updated session with new role
      window.location.href = selectedRole === 'teacher' ? '/teacher' : '/student';
    } else {
      alert('Failed to set role. Please try again.');
      setLoading(false);
    }
  };

  if (!user) return <LoadingSpinner />;

  if (user.publicMetadata?.role) {
    return <div className="p-6">Redirecting...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6 text-foreground">
      <div className="border border-border bg-white px-8 py-12 text-center shadow-sm">
        <h1 className="mb-4 text-3xl font-semibold">Welcome to GradeMeIn</h1>
        <p className="mb-8 text-muted-foreground">
          Tell us your role so we can set things up for you.
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setSelectedRole('teacher')}
            className={`border-2 p-6 transition ${
              selectedRole === 'teacher'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-white hover:bg-muted'
            }`}
          >
            <div className="mb-2 text-4xl">👨‍🏫</div>
            <h3 className="mb-2 text-lg font-semibold">Teacher</h3>
            <p className="text-sm text-muted-foreground">
              Create courses, assign work, review submissions
            </p>
          </button>

          <button
            onClick={() => setSelectedRole('student')}
            className={`border-2 p-6 transition ${
              selectedRole === 'student'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-white hover:bg-muted'
            }`}
          >
            <div className="mb-2 text-4xl">🎓</div>
            <h3 className="mb-2 text-lg font-semibold">Student</h3>
            <p className="text-sm text-muted-foreground">
              View assignments, submit work, track grades
            </p>
          </button>
        </div>

        <Button
          onClick={handleRoleSelection}
          disabled={!selectedRole || loading}
          className="h-12 bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
