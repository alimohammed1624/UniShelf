'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Resource, TagBrief } from '@/types';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  editResource,
  deleteResource,
  changeResourceFile,
} from '@/lib/features/resources/resourceSlice';
import {
  createTag,
  assignTagsToResource,
  removeTagFromResource,
} from '@/lib/features/tags/tagSlice';

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<TagBrief[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);

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

  const resourceId = parseInt(resolvedParams.id, 10);

  useEffect(() => {
    let cancelled = false;

    async function fetchResource() {
      try {
        const response = await api.get(`/resources/${resourceId}`);
        if (!cancelled) {
          setResource(response.data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
          if (axiosErr.response?.status === 404) {
            setError('Resource not found');
          } else if (axiosErr.response?.status === 403) {
            setError('You do not have permission to view this resource');
          } else {
            setError('Failed to load resource. Please try again.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function fetchTags() {
      try {
        const response = await api.get('/tags');
        if (!cancelled) {
          setAllTags(response.data);
        }
      } catch {
        // Tags are optional; proceed without them
      } finally {
        if (!cancelled) {
          setTagsLoading(false);
        }
      }
    }

    fetchResource();
    fetchTags();

    return () => { cancelled = true; };
  }, [resourceId]);

  // ── Edit handlers ────────────────────────────────────────

  const openEditModal = (res: Resource) => {
    setEditingResource(res);
    setEditTitle(res.title);
    setEditDescription(res.description || '');
    setEditVisibility(res.is_public ? 'public' : 'private');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    const promise = dispatch(editResource({
      id: editingResource.id,
      title: editTitle,
      description: editDescription,
      is_public: editVisibility === 'public',
    })).unwrap();
    toast.promise(promise, { loading: 'Saving...', success: 'Resource updated', error: 'Edit failed' });
    await promise;
    setEditingResource(null);
    const response = await api.get(`/resources/${editingResource.id}`);
    setResource(response.data);
  };

  // ── Delete handler ───────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;
    const promise = dispatch(deleteResource(deleteId)).unwrap();
    toast.promise(promise, { loading: 'Deleting...', success: 'Resource deleted', error: 'Delete failed' });
    await promise;
    router.back();
  };

  // ── Change file handler ──────────────────────────────────

  const handleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingResource || !changeFile) return;
    const formData = new FormData();
    formData.append('file', changeFile);
    const promise = dispatch(changeResourceFile({ id: changingResource.id, formData })).unwrap();
    toast.promise(promise, { loading: 'Replacing...', success: 'File replaced', error: 'File change failed' });
    await promise;
    setChangingResource(null);
    setChangeFile(null);
    const response = await api.get(`/resources/${changingResource.id}`);
    setResource(response.data);
  };

  // ── Tag handlers ─────────────────────────────────────────

  const handleCreateAndAssignTag = async () => {
    if (!taggingResource || !newTagName.trim()) return;
    try {
      const tag = await dispatch(createTag({ name: newTagName.trim() })).unwrap();
      const currentIds = taggingResource.tags.map((t) => t.id);
      const promise = dispatch(assignTagsToResource({ resourceId: taggingResource.id, tagIds: [...currentIds, tag.id] })).unwrap();
      toast.promise(promise, { loading: 'Saving tags...', success: 'Tags updated', error: 'Failed to assign tags' });
      await promise;
      // Refresh resource data
      const response = await api.get(`/resources/${taggingResource.id}`);
      setResource(response.data);
    } catch {
      toast.error('Failed to create or assign tag');
    }
    setNewTagName('');
  };

  const handleAssignExistingTag = async (tagId: number) => {
    if (!taggingResource) return;
    const currentIds = taggingResource.tags.map((t) => t.id);
    if (currentIds.includes(tagId)) return;
    try {
      const promise = dispatch(assignTagsToResource({ resourceId: taggingResource.id, tagIds: [...currentIds, tagId] })).unwrap();
      toast.promise(promise, { loading: 'Saving tags...', success: 'Tags updated', error: 'Failed to assign tags' });
      await promise;
      // Refresh resource data
      const response = await api.get(`/resources/${taggingResource.id}`);
      setResource(response.data);
    } catch {
      toast.error('Failed to assign tag');
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!taggingResource) return;
    try {
      const promise = dispatch(removeTagFromResource({ resourceId: taggingResource.id, tagId })).unwrap();
      toast.promise(promise, { loading: 'Removing tag...', success: 'Tag removed', error: 'Failed to remove tag' });
      await promise;
      // Refresh resource data
      const response = await api.get(`/resources/${taggingResource.id}`);
      setResource(response.data);
    } catch {
      toast.error('Failed to remove tag');
    }
  };

  const activeTaggingResource = taggingResource
    ? (resource?.id === taggingResource.id ? resource : taggingResource) ?? taggingResource
    : null;

  const availableTags = activeTaggingResource && !tagsLoading
    ? allTags.filter((t) => !activeTaggingResource.tags.some((rt) => rt.id === t.id))
    : [];

  // ── Preview helpers ──────────────────────────────────────

  const downloadUrl = resource ? `/api/resources/${resource.id}/download` : '';

  const isPdf = resource?.type === 'application/pdf';
  const isImage = resource?.type?.startsWith('image/');
  const isText = resource?.type?.startsWith('text/');
  const canPreview = isPdf || isImage || isText;

  // ── Loading state ────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading resource...</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────

  if (error || !resource) {
    return (
      <div className="space-y-4 py-10 text-center">
        <h1 className="text-xl font-semibold">{error ?? 'Resource not found'}</h1>
        <Button onClick={() => router.push('/search')}>Back to Search</Button>
      </div>
    );
  }

  // ── Render detail page ───────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()}>
        ← Back
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        {/* ── Left column: Preview ─────────────────────────── */}
        {canPreview ? (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isPdf && (
                <iframe
                  src={downloadUrl}
                  className="w-full h-[60vh] border-0"
                  title={`Preview of ${resource.title}`}
                />
              )}
              {isImage && (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={downloadUrl}
                    alt={resource.title}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
              )}
              {isText && (
                <TextPreview url={downloadUrl} />
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Right column: Metadata ───────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{resource.title}</h2>
              {resource.description && (
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {resource.description}
                </p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Filename:</span>{' '}
                <span className="text-muted-foreground">{resource.filename ?? '—'}</span>
              </div>
              <div>
                <span className="font-medium">Size:</span>{' '}
                <span className="text-muted-foreground">{formatSize(resource.size)}</span>
              </div>
              <div>
                <span className="font-medium">Type:</span>{' '}
                <span className="text-muted-foreground">{resource.type}</span>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium">Tags</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {resource.tags.length > 0 ? (
                  resource.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No tags</span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Uploader:</span>{' '}
                <span className="text-muted-foreground">User #{resource.uploader_id}</span>
              </div>
              <div>
                <span className="font-medium">Visibility:</span>{' '}
                <Badge variant={resource.is_public ? 'default' : 'secondary'} className="ml-1 text-xs capitalize">
                  {resource.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                <span className="text-muted-foreground">{new Date(resource.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium">Updated:</span>{' '}
                <span className="text-muted-foreground">
                  {resource.updated_at ? new Date(resource.updated_at).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>

            {/* Download button */}
            <Button asChild className="w-full" size="lg">
              <a href={downloadUrl} download>
                Download
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Owner actions bar ──────────────────────────────── */}
      {(resource.owner_id === user?.id || (user && user.role >= 2)) && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openEditModal(resource)}>Edit</Button>
          <Button variant="outline" onClick={() => setChangingResource(resource)}>Change File</Button>
          <Button variant="outline" onClick={() => setTaggingResource(resource)}>Manage Tags</Button>
          <Button variant="destructive" onClick={() => setDeleteId(resource.id)}>Delete</Button>
        </div>
      )}

      {/* ── Modals (same as ResourceTableCard) ─────────────── */}

      {/* Edit modal */}
      <AlertDialog open={!!editingResource} onOpenChange={(open) => { if (!open) setEditingResource(null); }}>
        <AlertDialogContent>
          <form onSubmit={handleEditSubmit}>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Resource</AlertDialogTitle>
              <AlertDialogDescription>Update the metadata for this resource.</AlertDialogDescription>
            </AlertDialogHeader>
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

      {/* Delete confirmation */}
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

      {/* Change file modal */}
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

      {/* Tags modal */}
      <AlertDialog open={!!taggingResource} onOpenChange={(open) => { if (!open) { setTaggingResource(null); setNewTagName(''); } }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Tags</AlertDialogTitle>
            <AlertDialogDescription>
              Add or remove tags for <span className="font-medium">{activeTaggingResource?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
                      aria-label={`Remove tag ${tag.name}`}
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Create & Add New Tag</Label>
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
    </div>
  );
}

// ── Text preview sub-component (separate to avoid re-renders) ──

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(url, { responseType: 'text' })
      .then((res) => { if (!cancelled) setText(res.data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [url]);

  if (error || text === null) {
    return <div className="p-4 text-sm text-muted-foreground">Failed to load preview</div>;
  }

  return (
    <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[60vh] whitespace-pre-wrap text-sm font-mono">
      {text}
    </pre>
  );
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
