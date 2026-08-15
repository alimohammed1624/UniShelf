'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { ResourceUploadCard } from '@/components/dashboard/resource-upload-card';
import { ResourceTableCard } from '@/components/dashboard/resource-table-card';
import {
  fetchResources,
  uploadResource,
  submitLink,
  createDirectory,
  downloadResource,
  editResource,
  deleteResource,
  restoreResource,
  fetchMyArchivedResources,
  changeResourceFile,
} from '@/lib/features/resources/resourceSlice';
import {
  fetchTags,
  createTag,
  assignTagsToResource,
  removeTagFromResource,
} from '@/lib/features/tags/tagSlice';
import { Button } from '@/components/ui/button';
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
import { ThemeSelect } from '@/components/admin/theme-select';
import { ArchiveKind } from '@/types';
import { toast } from 'sonner';

export default function MyResourcesPage() {
  const dispatch = useAppDispatch();
  const { items: resources, archivedItems, loading } = useAppSelector((state) => state.resources);
  const { user } = useAppSelector((state) => state.auth);
  const { items: allTags } = useAppSelector((state) => state.tags);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [anonymous, setAnonymous] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    if (resources.length === 0) dispatch(fetchResources());
    if (allTags.length === 0) dispatch(fetchTags());
  }, [dispatch, resources.length, allTags.length]);

  // Archived rows live outside the shared `items` list, so they need their own
  // fetch. Re-run on every switch back so a just-archived resource shows up.
  useEffect(() => {
    if (statusFilter === 'archived') dispatch(fetchMyArchivedResources());
  }, [dispatch, statusFilter]);

  const myResources = resources.filter((r) => r.owner_id === user?.id);
  const activeResources = myResources.filter((r) => !r.is_archived);
  const archivedResources = archivedItems.filter((r) => r.owner_id === user?.id);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    formData.append('is_public', String(visibility === 'public'));
    formData.append('is_anonymous', String(anonymous));

    try {
      const promise = dispatch(uploadResource(formData)).unwrap();
      toast.promise(promise, {
        loading: 'Uploading...',
        success: 'Upload successful',
        error: (err) => (typeof err === 'string' ? err : 'Upload failed'),
      });
      await promise;
      setTitle('');
      setDescription('');
      setFile(null);
      setVisibility('public');
      setAnonymous(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // handled by toast
    }
  };

  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    try {
      const promise = dispatch(submitLink({ title, description, url: linkUrl, is_public: visibility === 'public', is_anonymous: anonymous })).unwrap();
      toast.promise(promise, {
        loading: 'Adding link...',
        success: 'Link added',
        error: (err) => (typeof err === 'string' ? err : 'Failed to add link'),
      });
      await promise;
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setVisibility('public');
      setAnonymous(false);
    } catch {
      // handled by toast
    }
  };

  const handleCreateDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const promise = dispatch(
        createDirectory({ title, description, is_public: visibility === 'public', is_anonymous: anonymous }),
      ).unwrap();
      toast.promise(promise, {
        loading: 'Creating folder...',
        success: 'Folder created',
        error: (err) => (typeof err === 'string' ? err : 'Failed to create folder'),
      });
      await promise;
      setTitle('');
      setDescription('');
      setVisibility('public');
      setAnonymous(false);
    } catch {
      // handled by toast
    }
  };

  const handleDownload = async (id: number, resourceTitle: string) => {
    const promise = dispatch(downloadResource({ id, title: resourceTitle })).unwrap();
    toast.promise(promise, { loading: 'Downloading...', success: 'Download started', error: 'Download failed' });
    await promise.catch(() => {});
  };

  const handleEdit = async (id: number, t: string, desc: string, visibility: string, anonymous: boolean) => {
    try {
      const promise = dispatch(editResource({ id, title: t, description: desc, is_public: visibility === 'public', is_anonymous: anonymous })).unwrap();
      toast.promise(promise, { loading: 'Saving...', success: 'Resource updated', error: 'Edit failed' });
      await promise;
      return true;
    } catch {
      return false;
    }
  };

  // DELETE /resources/{id} archives rather than destroys — the copy says so.
  const handleArchive = async (id: number) => {
    try {
      const promise = dispatch(deleteResource(id)).unwrap();
      toast.promise(promise, { loading: 'Archiving...', success: 'Resource archived', error: 'Archive failed' });
      await promise;
      return true;
    } catch {
      return false;
    }
  };

  // The backend decides whether this archive may be lifted (403 for moderation
  // takedowns, 409 while the parent folder is still archived), so surface its message.
  const handleRestore = async (id: number) => {
    setRestoringId(id);
    const promise = dispatch(restoreResource(id)).unwrap();
    toast.promise(promise, {
      loading: 'Restoring...',
      success: 'Resource restored',
      error: (err) => (typeof err === 'string' ? err : 'Restore failed'),
    });
    await promise.catch(() => {});
    setRestoringId(null);
  };

  const handleChangeFile = async (id: number, newFile: File) => {
    const formData = new FormData();
    formData.append('file', newFile);
    try {
      const promise = dispatch(changeResourceFile({ id, formData })).unwrap();
      toast.promise(promise, { loading: 'Replacing file...', success: 'File replaced', error: 'File change failed' });
      await promise;
      return true;
    } catch {
      return false;
    }
  };

  const handleCreateTag = async (name: string) => {
    try { return await dispatch(createTag({ name })).unwrap(); }
    catch { toast.error('Failed to create tag'); return null; }
  };

  const handleAssignTags = async (resourceId: number, tagIds: number[]) => {
    try {
      const promise = dispatch(assignTagsToResource({ resourceId, tagIds })).unwrap();
      toast.promise(promise, { loading: 'Saving tags...', success: 'Tags updated', error: 'Failed to assign tags' });
      await promise; return true;
    } catch { return false; }
  };

  const handleRemoveTag = async (resourceId: number, tagId: number) => {
    try {
      const promise = dispatch(removeTagFromResource({ resourceId, tagId })).unwrap();
      toast.promise(promise, { loading: 'Removing tag...', success: 'Tag removed', error: 'Failed to remove tag' });
      await promise; return true;
    } catch { return false; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Resources</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Status:</label>
          <ThemeSelect<'active' | 'archived'>
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: `Archived${archivedResources.length > 0 ? ` (${archivedResources.length})` : ''}` },
            ]}
          />
        </div>
      </div>

      {statusFilter === 'active' ? (
        <>
          <ResourceUploadCard
            title={title}
            description={description}
            file={file}
            fileInputRef={fileInputRef}
            linkUrl={linkUrl}
            visibility={visibility}
            anonymous={anonymous}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onFileChange={setFile}
            onRemoveFile={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            onLinkUrlChange={setLinkUrl}
            onVisibilityChange={setVisibility}
            onAnonymousChange={setAnonymous}
            onSubmitFile={handleUpload}
            onSubmitLink={handleSubmitLink}
            onSubmitDirectory={handleCreateDirectory}
            tabs={['file', 'link', 'directory']}
          />
          <ResourceTableCard
            resources={activeResources}
            loading={loading}
            currentUserId={user?.id ?? null}
            currentUserRole={user?.role ?? 0}
            allTags={allTags}
            onDownload={handleDownload}
            onEdit={handleEdit}
            onDelete={handleArchive}
            onChangeFile={handleChangeFile}
            onCreateTag={handleCreateTag}
            onAssignTags={handleAssignTags}
            onRemoveTag={handleRemoveTag}
            storageKey="viewMode:my-resources"
            hideActions
          />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Archived Resources</CardTitle>
            <CardDescription>
              {loading ? 'Loading resources...' : `${archivedResources.length} archived`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archivedResources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing archived. Resources you archive stay here so you can restore them.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Archived</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedResources.map((resource) => {
                    // A moderation takedown is only a moderator's to lift — the
                    // backend answers 403, so don't offer the owner a dead button.
                    const takenDown = resource.archive_kind === ArchiveKind.MODERATION;
                    return (
                      <TableRow key={resource.id}>
                        {/* Not linked: archived resources 404 on the detail route. */}
                        <TableCell className="font-medium">{resource.title}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground text-xs">
                          {resource.filename ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {resource.archived_at ? new Date(resource.archived_at).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {takenDown ? (
                            <div className="space-y-1">
                              <Badge variant="destructive">Removed by a moderator</Badge>
                              {resource.archive_reason && (
                                <p className="text-xs text-muted-foreground">{resource.archive_reason}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary">Archived by you</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {takenDown ? (
                            <span className="text-xs text-muted-foreground">Contact a moderator</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={restoringId === resource.id}
                              onClick={() => handleRestore(resource.id)}
                            >
                              {restoringId === resource.id ? 'Restoring...' : 'Restore'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
