'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { checkRole } from '@/utils/roles';

export async function setUserRole(userId: string, role: 'teacher' | 'student') {
  const { userId: currentUserId } = await auth();
  
  if (!currentUserId) {
    return { error: 'Not authenticated' };
  }

  // Only admins or the user themselves during first login can set roles
  const isAdmin = await checkRole('admin');
  const isSelf = currentUserId === userId;
  
  if (!isAdmin && !isSelf) {
    return { error: 'Not authorized' };
  }

  try {
    const client = await clerkClient();
    const res = await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });
    return { success: true, metadata: res.publicMetadata };
  } catch (err) {
    return { error: 'Failed to update role' };
  }
}
