'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { banUser, restoreUser, resetUserPassword } from '@/lib/features/admin/adminSlice';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BanDialog } from '@/components/admin/ban-dialog';
import { TempPasswordDialog } from '@/components/admin/temp-password-dialog';
import { canManageAccount } from '@/lib/roles';
import { toast } from 'sonner';
import type { AdminUser, TempPasswordResult } from '@/types';

/**
 * Suspend / restore / reset-password controls for a single user row.
 *
 * Rows are gated by `canManageAccount`, which follows the chain of command:
 * superadmins see these controls on admins, admins see them on everyone
 * below. The API accepts any strictly-lower role, so this is a presentation
 * rule, not the security boundary.
 */
/** Explains why a row has no account actions, so an empty cell is never a mystery. */
function unmanageableReason(user: AdminUser, actorRole: number, isSelf: boolean): string {
  if (isSelf) return 'You';
  if (user.role >= actorRole) return 'Equal or higher role';
  return 'Managed by their admin';
}

export function UserActions({
  user,
  actorRole,
  selfId,
}: {
  user: AdminUser;
  actorRole: number;
  selfId: number | undefined;
}) {
  const dispatch = useAppDispatch();
  const [banOpen, setBanOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<TempPasswordResult | null>(null);

  const isSelf = user.id === selfId;
  const canManage = !isSelf && canManageAccount(actorRole, user.role);

  if (!canManage) {
    return <span className="text-xs text-muted-foreground">{unmanageableReason(user, actorRole, isSelf)}</span>;
  }

  const handleBan = async (reason: string, durationHours: number | null) => {
    try {
      await dispatch(banUser({ userId: user.id, reason, durationHours })).unwrap();
      setBanOpen(false);
      toast.success(durationHours ? 'User temporarily suspended' : 'User suspended');
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleRestore = async () => {
    try {
      await dispatch(restoreUser(user.id)).unwrap();
      toast.success('User restored');
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleReset = async () => {
    try {
      const result = await dispatch(resetUserPassword(user.id)).unwrap();
      setResetOpen(false);
      setTempPassword(result);
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {user.is_active ? (
        <Button variant="destructive" size="sm" onClick={() => setBanOpen(true)}>
          Suspend
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={handleRestore}>
          Restore
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
        Reset password
      </Button>

      {banOpen && (
        <BanDialog
          userLabel={user.full_name || user.email}
          onOpenChange={setBanOpen}
          onConfirm={handleBan}
        />
      )}

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password for {user.full_name || user.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their current password stops working immediately. You&apos;ll get a generated
              replacement to pass on — shown only once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleReset}>
              Reset password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TempPasswordDialog result={tempPassword} onClose={() => setTempPassword(null)} />
    </div>
  );
}
