'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function GetStartedButton({ className = '', variant = 'default' as 'default' | 'outline' }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const handleClick = () => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const role = user.publicMetadata?.role as string;

    if (!role) {
      router.push('/onboarding');
      return;
    }

    if (role === 'teacher') {
      router.push('/teacher');
    } else if (role === 'student') {
      router.push('/student');
    } else {
      router.push('/onboarding');
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={className}
      variant={variant}
      disabled={!isLoaded}
    >
      Get started
    </Button>
  );
}
