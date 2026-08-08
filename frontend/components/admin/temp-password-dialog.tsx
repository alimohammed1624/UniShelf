'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { TempPasswordResult } from '@/types';

/**
 * Shows a generated password once. The value lives only in the caller's
 * component state — it is never persisted and cannot be retrieved again.
 */
export function TempPasswordDialog({
  result,
  onClose,
}: {
  result: TempPasswordResult | null;
  onClose: () => void;
}) {
  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.temp_password);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Could not copy — select the password and copy it manually');
    }
  };

  return (
    <AlertDialog open={result !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Temporary password for {result?.email}</AlertDialogTitle>
          <AlertDialogDescription>
            This is shown once and cannot be retrieved again. Relay it to the user over a
            separate channel, and ask them to change it from their profile page.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all select-all">
            {result?.temp_password}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            Copy
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>I&apos;ve saved it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
