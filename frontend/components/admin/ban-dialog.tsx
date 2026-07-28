'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeSelect } from '@/components/admin/theme-select';

/** Duration in hours; 'permanent' maps to a null duration on the API. */
const DURATION_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: '24', label: '24 hours' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
];

/**
 * Mount this only while it should be open — the caller unmounting it on close
 * is what clears the inputs between users, so there is no reset effect here.
 */
export function BanDialog({
  userLabel,
  onOpenChange,
  onConfirm,
}: {
  userLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, durationHours: number | null) => void;
}) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend {userLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will be signed out and blocked from logging in. A temporary suspension lifts
            itself automatically once it expires.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Input
              id="ban-reason"
              value={reason}
              maxLength={500}
              placeholder="Repeated policy violations"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label>Duration</Label>
            <ThemeSelect value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              onConfirm(reason, duration === 'permanent' ? null : Number(duration))
            }
          >
            Suspend
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
