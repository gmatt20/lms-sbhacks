import { auth } from '@clerk/nextjs/server';

export type UserRole = 'teacher' | 'student' | 'admin';

export const checkRole = async (role: UserRole) => {
  const { sessionClaims } = await auth();
  return (sessionClaims?.publicMetadata as { role?: UserRole })?.role === role;
};

export const getUserRole = async (): Promise<UserRole | null> => {
  const { sessionClaims } = await auth();
  return ((sessionClaims?.publicMetadata as { role?: UserRole })?.role as UserRole) || null;
};
