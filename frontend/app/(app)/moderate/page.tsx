'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchReports, resolveReport, dismissReport, clearReports } from '@/lib/features/moderate/moderateSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  useEffect(() => {
    const statusFilter = activeTab === 'open' ? 0 : 1;
    dispatch(fetchReports({ statusFilter }));
    return () => {
      dispatch(clearReports());
    };
  }, [activeTab, dispatch]);

  const reports = useAppSelector((state) => state.moderate.reports);
  const loading = useAppSelector((state) => state.moderate.loading);
  const error = useAppSelector((state) => state.moderate.error);

  const currentStatusFilter = activeTab === 'open' ? 0 : 1;
  const filteredReports = reports.filter((r) => r.status === currentStatusFilter);

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
          Open Reports ({reports.filter((r) => r.status === 0).length})
        </Button>
        <Button
          variant={activeTab === 'archived' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('archived')}
        >
          Archived Resources ({reports.filter((r) => r.status === 1).length})
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>{activeTab === 'open' ? 'Open Reports' : 'Archived Resources'}</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredReports.length} ${activeTab === 'open' ? 'pending reports' : 'archived resources'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {activeTab === 'open' ? 'No open reports. Great job!' : 'No archived resources from moderation.'}
            </p>
          ) : (
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
                {filteredReports.map((report) => (
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
                      {activeTab === 'open' && (
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
                      )}
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
    </div>
  );
}
