'use client';

import { useAppSelector } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ROLE_LABELS: Record<number, string> = {
  0: 'Student',
  1: 'Moderator',
  2: 'Admin',
  3: 'Super Admin',
};

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{user.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span>{ROLE_LABELS[user.role] ?? `Role ${user.role}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account status</span>
            <span className={user.is_active ? 'text-green-600' : 'text-red-500'}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
