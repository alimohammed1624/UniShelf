'use client';

import { useState } from 'react';
import { Resource, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  allTags: Tag[];
  onDownload: (id: number, title: string) => void;
  onEdit: (id: number, title: string, description: string, visibility: string) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
  onChangeFile: (id: number, file: File) => Promise<boolean>;
  onCreateTag: (name: string) => Promise<Tag | null>;
  onAssignTags: (resourceId: number, tagIds: number[]) => Promise<boolean>;
  onRemoveTag: (resourceId: number, tagId: number) => Promise<boolean>;
}

export function ResourceTableCard({
  resources,
  loading,
  currentUserId,
  currentUserRole,
  allTags,
  onDownload,
  onEdit,
  onDelete,
  onChangeFile,
  onCreateTag,
  onAssignTags,
  onRemoveTag,
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

  // Tags modal state
  const [taggingResource, setTaggingResource] = useState<Resource | null>(null);
  const [newTagName, setNewTagName] = useState('');

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

  const handleCreateAndAssignTag = async () => {
    if (!taggingResource || !newTagName.trim()) return;
    const tag = await onCreateTag(newTagName.trim());
    if (tag) {
      const currentIds = taggingResource.tags.map((t) => t.id);
      const success = await onAssignTags(taggingResource.id, [...currentIds, tag.id]);
      if (success) {
        // Update local reference so the modal reflects the change
        const updated = resources.find((r) => r.id === taggingResource.id);
        if (updated) setTaggingResource(updated);
      }
    }
    setNewTagName('');
  };

  const handleAssignExistingTag = async (tagId: number) => {
    if (!taggingResource) return;
    const currentIds = taggingResource.tags.map((t) => t.id);
    if (currentIds.includes(tagId)) return; // already assigned
    const success = await onAssignTags(taggingResource.id, [...currentIds, tagId]);
    if (success) {
      const updated = resources.find((r) => r.id === taggingResource.id);
      if (updated) setTaggingResource(updated);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!taggingResource) return;
    const success = await onRemoveTag(taggingResource.id, tagId);
    if (success) {
      const updated = resources.find((r) => r.id === taggingResource.id);
      if (updated) setTaggingResource(updated);
    }
  };

  // Keep taggingResource in sync with resources list
  const activeTaggingResource = taggingResource
    ? resources.find((r) => r.id === taggingResource.id) ?? taggingResource
    : null;
  const availableTags = activeTaggingResource
    ? allTags.filter((t) => !activeTaggingResource.tags.some((rt) => rt.id === t.id))
    : [];

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
                  <TableHead>Tags</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">
                      <Link href={`/resources/${resource.id}`} className="cursor-pointer hover:underline">
                        {resource.title}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-xs">{resource.filename ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.length > 0 ? resource.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary" className="text-xs">{tag.name}</Badge>
                        )) : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
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
                            <Button size="sm" variant="outline" onClick={() => setTaggingResource(resource)}>
                              Tags
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

      {/* ── Tags Modal ── */}
      <AlertDialog open={!!taggingResource} onOpenChange={(open) => { if (!open) { setTaggingResource(null); setNewTagName(''); } }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Tags</AlertDialogTitle>
            <AlertDialogDescription>
              Add or remove tags for <span className="font-medium">{activeTaggingResource?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Current tags */}
          <div className="space-y-3 py-2">
            <Label className="text-xs text-muted-foreground">Current Tags</Label>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {activeTaggingResource && activeTaggingResource.tags.length > 0 ? (
                activeTaggingResource.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 text-xs leading-none"
                    >
                      ×
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No tags assigned</span>
              )}
            </div>

            {/* Add existing tag */}
            {availableTags.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Add Existing Tag</Label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent text-xs"
                      onClick={() => handleAssignExistingTag(tag.id)}
                    >
                      + {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Create new tag */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Create &amp; Add New Tag</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Tag name…"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAndAssignTag(); } }}
                />
                <Button type="button" size="sm" onClick={handleCreateAndAssignTag} disabled={!newTagName.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Done</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
