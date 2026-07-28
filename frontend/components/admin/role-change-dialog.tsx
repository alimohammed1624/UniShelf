'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { changeUserRole } from '@/lib/features/admin/adminSlice';
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
import { ThemeSelect } from '@/components/admin/theme-select';
import { ROLE_OPTIONS, ROLE_SUPERADMIN, getRoleLabel } from '@/lib/roles';
import { toast } from 'sonner';
import type { AdminUser } from '@/types';

/**
 * Promote or demote a user. Only roles up to the actor's own are offered,
 * matching `assert_can_change_role` on the backend.
 */
export function RoleChangeControl({
  user,
  actorRole,
  selfId,
}: {
  user: AdminUser;
  actorRole: number;
  selfId: number | undefined;
}) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [newRole, setNewRole] = useState(user.role);

  const isSelf = user.id === selfId;
  const canManage = !isSelf && user.role < actorRole;

  if (!canManage) {
    return (
      <span className="text-xs text-muted-foreground">
        {isSelf ? 'You' : 'Superadmins cannot be modified by peers'}
      </span>
    );
  }

  const handleConfirm = async () => {
    try {
      await dispatch(changeUserRole({ userId: user.id, newRole })).unwrap();
      setOpen(false);
      toast.success(`${user.full_name || user.email} is now ${getRoleLabel(newRole)}`);
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setNewRole(user.role);
          setOpen(true);
        }}
      >
        Change role
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role for {user.full_name || user.email}</AlertDialogTitle>
            <AlertDialogDescription>
              Currently {getRoleLabel(user.role)}.
              {newRole === ROLE_SUPERADMIN
                ? ' Promoting to Super Admin is not reversible from this dashboard — superadmins cannot be demoted, suspended, or reset by their peers.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center gap-2">
            <ThemeSelect
              value={newRole}
              onChange={setNewRole}
              options={ROLE_OPTIONS.filter((o) => o.value <= actorRole).map((o) => ({
                value: o.value as number,
                label: o.label,
              }))}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={newRole === ROLE_SUPERADMIN ? 'destructive' : 'default'}
              disabled={newRole === user.role}
              onClick={handleConfirm}
            >
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
