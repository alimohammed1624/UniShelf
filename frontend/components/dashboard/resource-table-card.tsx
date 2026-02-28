'use client';

import { useState } from 'react';
import { Resource } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface ResourceTableCardProps {
  resources: Resource[];
  loading: boolean;
  currentUserId: number | null;
  currentUserRole: number;
  onDownload: (id: number, title: string) => void;
  onEdit: (id: number, title: string, description: string, visibility: string) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
  onChangeFile: (id: number, file: File) => Promise<boolean>;
}

export function ResourceTableCard({
  resources,
  loading,
  currentUserId,
  currentUserRole,
  onDownload,
  onEdit,
  onDelete,
  onChangeFile,
}: ResourceTableCardProps) {
  const isOwnerOrAdmin = (resource: Resource) =>
    resource.owner_id === currentUserId || currentUserRole >= 2;
  // Edit modal state
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Change file modal state
  const [changingResource, setChangingResource] = useState<Resource | null>(null);
  const [changeFile, setChangeFile] = useState<File | null>(null);

  const openEditModal = (resource: Resource) => {
    setEditingResource(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description || '');
    setEditVisibility(resource.is_public ? 'public' : 'private');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    const success = await onEdit(editingResource.id, editTitle, editDescription, editVisibility);
    if (success) setEditingResource(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  const handleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingResource || !changeFile) return;
    const success = await onChangeFile(changingResource.id, changeFile);
    if (success) {
      setChangingResource(null);
      setChangeFile(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Available Resources</CardTitle>
          <CardDescription>
            {loading ? 'Loading resources...' : `${resources.length} resources available`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">{resource.title}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-xs">{resource.filename ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{resource.description}</TableCell>
                    <TableCell className="capitalize">{resource.is_public ? 'Public' : 'Private'}</TableCell>
                    <TableCell>User #{resource.uploader_id}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" onClick={() => onDownload(resource.id, resource.title)}>
                          Download
                        </Button>
                        {isOwnerOrAdmin(resource) && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditModal(resource)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setChangingResource(resource)}>
                              Change
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteId(resource.id)}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Resource Modal ── */}
      <AlertDialog open={!!editingResource} onOpenChange={(open) => { if (!open) setEditingResource(null); }}>
        <AlertDialogContent>
          <form onSubmit={handleEditSubmit}>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Resource</AlertDialogTitle>
              <AlertDialogDescription>Update the metadata for this resource.</AlertDialogDescription>
            </AlertDialogHeader>

            {editingResource && (
              <div className="my-4 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">ID:</span> {editingResource.id}</p>
                <p><span className="font-medium text-foreground">File:</span> {editingResource.file_path}</p>
                <p><span className="font-medium text-foreground">Uploader:</span> User #{editingResource.uploader_id}</p>
                <p><span className="font-medium text-foreground">Created:</span> {new Date(editingResource.created_at).toLocaleString()}</p>
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit">Save</Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resource? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Change File Modal ── */}
      <AlertDialog open={!!changingResource} onOpenChange={(open) => { if (!open) { setChangingResource(null); setChangeFile(null); } }}>
        <AlertDialogContent>
          <form onSubmit={handleChangeSubmit}>
            <AlertDialogHeader>
              <AlertDialogTitle>Change File</AlertDialogTitle>
              <AlertDialogDescription>
                Replace the file for <span className="font-medium">{changingResource?.title}</span>. All metadata will be kept.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 py-4">
              <Label>New File</Label>
              <Input
                type="file"
                onChange={(e) => setChangeFile(e.target.files ? e.target.files[0] : null)}
                required
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel type="button" onClick={() => { setChangingResource(null); setChangeFile(null); }}>Cancel</AlertDialogCancel>
              <Button type="submit">Upload New File</Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
