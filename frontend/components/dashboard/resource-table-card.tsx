'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Resource, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { List, Grid3x3, File as FileIcon } from 'lucide-react';
import api from '@/lib/api';

interface ResourceTableCardProps {
  resources: Resource[];
  loading: boolean;
  currentUserId: number | null;
  currentUserRole: number;
  allTags: Tag[];
  onDownload: (id: number, title: string) => void;
  onEdit: (id: number, title: string, description: string, visibility: string) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
  onChangeFile: (id: number, file: globalThis.File) => Promise<boolean>;
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
  const [changeFile, setChangeFile] = useState<globalThis.File | null>(null);

  // Tags modal state
  const [taggingResource, setTaggingResource] = useState<Resource | null>(null);
  const [newTagName, setNewTagName] = useState('');

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Thumbnail state
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  // Fetch thumbnails for grid view
  useEffect(() => {
    if (viewMode !== 'grid') return;

    const fetchThumbnails = async () => {
      const newThumbnails: Record<number, string> = {};
      for (const resource of resources) {
        if (resource.type?.startsWith('image/')) {
          try {
            const response = await api.get(`/resources/${resource.id}/download`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            newThumbnails[resource.id] = url;
          } catch (error) {
            console.warn(`Failed to fetch thumbnail for resource ${resource.id}:`, error);
          }
        }
      }
      setThumbnails(newThumbnails);
    };

    fetchThumbnails();

    // Cleanup function to revoke object URLs
    return () => {
      Object.values(thumbnails).forEach((url: string) => URL.revokeObjectURL(url));
      setThumbnails({});
    };
  }, [viewMode, resources]);

  const openEditModal = (resource: Resource) => {
    setEditingResource(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description || '');
    setEditVisibility(resource.is_public ? 'public' : 'private');
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

  const handleChangeSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      const currentIds = taggingResource.tags.map((t: { id: number }) => t.id);
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
    const currentIds = taggingResource.tags.map((t: { id: number }) => t.id);
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
    ? allTags.filter((t) => !activeTaggingResource.tags.some((rt: { id: number }) => rt.id === t.id))
    : [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Resources</CardTitle>
              <CardDescription>
                {loading ? 'Loading resources...' : `${resources.length} resources available`}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources found.</p>
          ) : viewMode === 'list' ? (
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
                    <TableCell className="font-medium">{resource.title}</TableCell>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((resource) => (
                <div key={resource.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-3">
                    {thumbnails[resource.id] ? (
                      <img src={thumbnails[resource.id]} alt={resource.title} className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-medium text-sm mb-1 truncate">{resource.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2 truncate">{resource.filename ?? 'No filename'}</p>
                  <p className="text-xs mb-2 truncate">{resource.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {resource.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">{tag.name}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {resource.is_public ? 'Public' : 'Private'} • User #{resource.uploader_id}
                  </div>
                  <div className="flex flex-wrap gap-1">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Resource Modal ── */}
      <AlertDialog open={!!editingResource} onOpenChange={(open: boolean) => { if (!open) setEditingResource(null); }}>
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
      <AlertDialog open={deleteId !== null} onOpenChange={(open: boolean) => { if (!open) setDeleteId(null); }}>
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
      <AlertDialog open={!!changingResource} onOpenChange={(open: boolean) => { if (!open) { setChangingResource(null); setChangeFile(null); } }}>
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
      <AlertDialog open={!!taggingResource} onOpenChange={(open: boolean) => { if (!open) { setTaggingResource(null); setNewTagName(''); } }}>
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
