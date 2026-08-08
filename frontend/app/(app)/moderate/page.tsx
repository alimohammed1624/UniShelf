'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  fetchReports,
  fetchArchivedResources,
  resolveReport,
  dismissReport,
  clearReports,
  clearArchivedResources,
} from '@/lib/features/moderate/moderateSlice';
import { restoreResource } from '@/lib/features/resources/resourceSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import Link from 'next/link';
import { toast } from 'sonner';
import { UserLabel } from '@/components/ui/user-label';

type Tab = 'open' | 'archived';

export default function ModeratePage() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const [confirmDismissId, setConfirmDismissId] = useState<number | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'open') {
      dispatch(fetchReports({ statusFilter: 0 }));
      return () => {
        dispatch(clearReports());
      };
    }
    dispatch(fetchArchivedResources({ skip: 0, limit: 50 }));
    return () => {
      dispatch(clearArchivedResources());
    };
  }, [activeTab, dispatch]);

  const reports = useAppSelector((state) => state.moderate.reports);
  const archivedResources = useAppSelector((state) => state.moderate.archivedResources);
  const loading = useAppSelector((state) => state.moderate.loading);
  const error = useAppSelector((state) => state.moderate.error);

  const openReports = reports.filter((r) => r.status === 0);
  const rowCount = activeTab === 'open' ? openReports.length : archivedResources.length;

  const handleArchive = async (reportId: number) => {
    await dispatch(resolveReport(reportId)).unwrap();
    setConfirmArchiveId(null);
    toast.success('Resource archived and report resolved');
  };

  const handleDismiss = async (reportId: number) => {
    await dispatch(dismissReport(reportId)).unwrap();
    setConfirmDismissId(null);
    toast.success('Report dismissed as false alarm');
  };

  const handleRestore = async (resourceId: number) => {
    try {
      await dispatch(restoreResource(resourceId)).unwrap();
      toast.success('Resource restored');
    } catch (err) {
      // The backend refuses with a reason (not permitted, parent still archived) — show it verbatim.
      toast.error(typeof err === 'string' ? err : 'Restore failed');
    }
    setConfirmRestoreId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moderator Panel</h1>
        <p className="text-muted-foreground">Review reports and manage reported resources.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'open' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('open')}
        >
          Open Reports ({openReports.length})
        </Button>
        <Button
          variant={activeTab === 'archived' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('archived')}
        >
          Archived Resources ({archivedResources.length})
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Reports / Archived Table */}
      <Card>
        <CardHeader>
          <CardTitle>{activeTab === 'open' ? 'Open Reports' : 'Archived Resources'}</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${rowCount} ${activeTab === 'open' ? 'pending reports' : 'archived resources'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rowCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              {activeTab === 'open' ? 'No open reports. Great job!' : 'No archived resources from moderation.'}
            </p>
          ) : activeTab === 'open' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <Link href={`/resources/${report.resource_id}`} className="hover:underline cursor-pointer">
                        {report.resource.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm"><UserLabel userId={report.resource.uploader_id} /></TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{report.reason}</TableCell>
                    <TableCell className="text-muted-foreground text-sm"><UserLabel userId={report.reported_by} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDismissId(report.id)}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmArchiveId(report.id)}
                        >
                          Archive & Resolve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Takedown Reason</TableHead>
                  <TableHead>Archived By</TableHead>
                  <TableHead>Archived</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedResources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">
                      <Link href={`/resources/${resource.id}`} className="hover:underline cursor-pointer">
                        {resource.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm"><UserLabel userId={resource.uploader_id} /></TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{resource.archive_reason || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {resource.archived_by_id !== null ? <UserLabel userId={resource.archived_by_id} /> : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {resource.archived_at ? new Date(resource.archived_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRestoreId(resource.id)}
                        >
                          Restore
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={confirmArchiveId !== null} onOpenChange={(open: boolean) => { if (!open) setConfirmArchiveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive & Resolve Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the reported resource and mark this report as resolved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => confirmArchiveId !== null && handleArchive(confirmArchiveId)}>
              Archive & Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dismiss Confirmation Dialog */}
      <AlertDialog open={confirmDismissId !== null} onOpenChange={(open: boolean) => { if (!open) setConfirmDismissId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the report as resolved without archiving the resource. Use this for false alarms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDismissId !== null && handleDismiss(confirmDismissId)}>
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={confirmRestoreId !== null} onOpenChange={(open: boolean) => { if (!open) setConfirmRestoreId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This lifts the takedown and makes the resource visible again. Any report already resolved stays resolved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestoreId !== null && handleRestore(confirmRestoreId)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
