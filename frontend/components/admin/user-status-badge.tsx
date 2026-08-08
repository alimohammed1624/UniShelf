import { Badge } from '@/components/ui/badge';
import type { AdminUser } from '@/types';

export function UserStatusBadge({ user }: { user: AdminUser }) {
  if (user.is_active) {
    return <Badge variant="outline">Active</Badge>;
  }

  if (user.banned_until) {
    return (
      <Badge variant="destructive" title={user.ban_reason || undefined}>
        Suspended until {new Date(user.banned_until).toLocaleDateString()}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" title={user.ban_reason || undefined}>
      Suspended
    </Badge>
  );
}
