'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Resource, TagBrief } from '@/types';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dirtree } from '@/components/dirtree/Dirtree';
import { useResourceTree } from '@/hooks/useResourceTree';
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
  downloadResource,
} from '@/lib/features/resources/resourceSlice';
import {
  createTag,
  assignTagsToResource,
  removeTagFromResource,
} from '@/lib/features/tags/tagSlice';
import { submitReport } from '@/lib/features/moderate/moderateSlice';
import { toggleBookmarkAsync } from '@/lib/features/bookmarks/bookmarksSlice';

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const bookmarkedResourceIds = useAppSelector((state) => state.bookmarks.ids);

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

  // Report modal state
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPageTransition, setPdfPageTransition] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);

  const resourceId = parseInt(resolvedParams.id, 10);

  const { data: treeData, loading: treeLoading } = useResourceTree({ resourceId });

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

  useEffect(() => {
    setPdfPage(1);
    setPdfZoom(100);
    setPdfNumPages(null);
    setPdfFullscreen(false);
    setPdfPreviewFailed(false);
    setPdfBlobUrl(null);
    setPdfPageTransition(false);
    setImageZoom(100);
    setImageFullscreen(false);
    setImageBlobUrl(null);
    setImageLoading(false);
    setImagePreviewFailed(false);
  }, [resource?.id]);

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

  // ── Report handler ───────────────────────────────────────

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource || !reportReason.trim()) return;
    const promise = dispatch(submitReport({ resource_id: resource.id, reason: reportReason })).unwrap();
    toast.promise(promise, { loading: 'Submitting report...', success: 'Report submitted', error: 'Failed to submit report' });
    await promise;
    setReporting(false);
    setReportReason('');
  };

  const activeTaggingResource = taggingResource
    ? (resource?.id === taggingResource.id ? resource : taggingResource) ?? taggingResource
    : null;

  const availableTags = activeTaggingResource && !tagsLoading
    ? allTags.filter((t) => !activeTaggingResource.tags.some((rt) => rt.id === t.id))
    : [];

  const isBookmarked = resource ? bookmarkedResourceIds.includes(resource.id) : false;

  const handleToggleBookmark = () => {
    if (!resource) return;
    dispatch(toggleBookmarkAsync(resource.id));
    toast.success(
      isBookmarked
        ? `Removed "${resource.title}" from bookmarks`
        : `Added "${resource.title}" to bookmarks`
    );
  };

  const handleDownload = () => {
    if (!resource) return;
    const promise = dispatch(downloadResource({ id: resource.id, title: resource.title })).unwrap();
    toast.promise(promise, { loading: 'Downloading...', success: 'Download started', error: 'Download failed' });
    promise.catch(() => {});
  };

  // ── Preview helpers ──────────────────────────────────────

  const apiDownloadPath = resource ? `/resources/${resource.id}/download` : '';
  const apiInlinePath = resource ? `/resources/${resource.id}/download?inline=1` : '';
  const downloadUrl = apiDownloadPath ? `/api${apiDownloadPath}` : '';
  const pdfPreviewUrl = pdfBlobUrl ? `${pdfBlobUrl}#toolbar=0&page=${pdfPage}&zoom=${pdfZoom}` : '';
  const pdfFrameKey = pdfBlobUrl ? `${pdfBlobUrl}-${pdfPage}-${pdfZoom}` : 'pdf-empty';
  const isPreviewFullscreen = pdfFullscreen || imageFullscreen;

  const isPdf = resource?.type === 'application/pdf';
  const isImage = resource?.type?.startsWith('image/');
  const isText = resource?.type?.startsWith('text/');
  const canPreview = isPdf || isImage || isText;
  const isFirstPdfPage = pdfPage <= 1;
  const isLastPdfPage = !!pdfNumPages && pdfPage >= pdfNumPages;

  useEffect(() => {
    if (!isPdf || !apiInlinePath) {
      setPdfBlobUrl(null);
      setPdfLoading(false);
      return;
    }

    let cancelled = false;
    let localUrl: string | null = null;
    setPdfLoading(true);
    setPdfPreviewFailed(false);

    const fetchPdfBlob = async () => {
      try {
        const inlineRes = await api.get(apiInlinePath, { responseType: 'blob' });
        if (cancelled) return;
        const inlineType = inlineRes.data?.type || '';
        if (inlineType.includes('pdf') || !inlineType.includes('json')) {
          localUrl = URL.createObjectURL(inlineRes.data);
          setPdfBlobUrl(localUrl);
          return;
        }
      } catch {
        // Try regular download endpoint as fallback.
      }

      try {
        const downloadRes = await api.get(apiDownloadPath, { responseType: 'blob' });
        if (cancelled) return;
        const downloadType = downloadRes.data?.type || '';
        if (downloadType.includes('pdf') || !downloadType.includes('json')) {
          localUrl = URL.createObjectURL(downloadRes.data);
          setPdfBlobUrl(localUrl);
          return;
        }
      } catch {
        // Mark failed below.
      }

      if (!cancelled) {
        setPdfPreviewFailed(true);
        setPdfBlobUrl(null);
      }
    };

    fetchPdfBlob().finally(() => {
      if (!cancelled) setPdfLoading(false);
    });

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [apiDownloadPath, apiInlinePath, isPdf]);

  useEffect(() => {
    if (!isImage || !apiInlinePath) {
      setImageBlobUrl(null);
      setImageLoading(false);
      return;
    }

    let cancelled = false;
    let localUrl: string | null = null;
    setImageLoading(true);
    setImagePreviewFailed(false);

    const fetchImageBlob = async () => {
      try {
        const inlineRes = await api.get(apiInlinePath, { responseType: 'blob' });
        if (cancelled) return;
        const inlineType = inlineRes.data?.type || '';
        if (inlineType.startsWith('image/') || !inlineType.includes('json')) {
          localUrl = URL.createObjectURL(inlineRes.data);
          setImageBlobUrl(localUrl);
          return;
        }
      } catch {
        // Try regular download endpoint as fallback.
      }

      try {
        const downloadRes = await api.get(apiDownloadPath, { responseType: 'blob' });
        if (cancelled) return;
        const downloadType = downloadRes.data?.type || '';
        if (downloadType.startsWith('image/') || !downloadType.includes('json')) {
          localUrl = URL.createObjectURL(downloadRes.data);
          setImageBlobUrl(localUrl);
          return;
        }
      } catch {
        // Mark failed below.
      }

      if (!cancelled) {
        setImagePreviewFailed(true);
        setImageBlobUrl(null);
      }
    };

    fetchImageBlob().finally(() => {
      if (!cancelled) setImageLoading(false);
    });

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [apiDownloadPath, apiInlinePath, isImage]);

  useEffect(() => {
    if (!pdfBlobUrl || !isPdf) {
      setPdfNumPages(null);
      return;
    }

    let cancelled = false;
    const loadPdfMeta = async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
        const { GlobalWorkerOptions, getDocument } = pdfjs;
        GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        const res = await fetch(pdfBlobUrl);
        const data = await res.arrayBuffer();
        const pdf = await getDocument({ data }).promise;
        if (cancelled) return;
        setPdfNumPages(pdf.numPages);
        setPdfPage((prev) => Math.min(prev, pdf.numPages));
      } catch {
        if (!cancelled) setPdfNumPages(null);
      }
    };

    loadPdfMeta();

    return () => {
      cancelled = true;
    };
  }, [isPdf, pdfBlobUrl]);

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

      <div className={`grid grid-cols-1 gap-6 ${isPreviewFullscreen ? '' : 'lg:grid-cols-[2fr_1fr]'}`}>
        {/* ── Left column: Preview ─────────────────────────── */}
        {canPreview ? (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isPdf && (
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (isFirstPdfPage) return;
                          setPdfPageTransition(true);
                          setPdfPage((p) => Math.max(1, p - 1));
                        }}
                        disabled={isFirstPdfPage}
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (isLastPdfPage) return;
                          setPdfPageTransition(true);
                          setPdfPage((p) => (pdfNumPages ? Math.min(pdfNumPages, p + 1) : p + 1));
                        }}
                        disabled={isLastPdfPage}
                      >
                        Next
                      </Button>
                    </div>

                    <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPdfZoom((z) => Math.max(50, z - 10))}
                        disabled={pdfZoom <= 50}
                      >
                        -
                      </Button>
                      <span className="min-w-12 text-center text-sm text-muted-foreground">{pdfZoom}%</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPdfZoom((z) => Math.min(300, z + 10))}
                        disabled={pdfZoom >= 300}
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setPdfFullscreen((prev) => !prev)}
                    >
                      {pdfFullscreen ? 'Exit full screen' : 'Full screen'}
                    </Button>
                  </div>

                  {pdfLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Loading PDF preview...</div>
                  ) : !pdfPreviewFailed && pdfBlobUrl ? (
                    <div className={`${isPreviewFullscreen ? 'h-[75vh]' : 'h-[60vh]'} w-full overflow-hidden rounded-md border bg-muted/10`}>
                      <iframe
                        key={pdfFrameKey}
                        src={pdfPreviewUrl}
                        onLoad={() => {
                          if (pdfPageTransition) {
                            setPdfPageTransition(false);
                          }
                        }}
                        className="h-full w-full border-0"
                        title={`Preview of ${resource.title}`}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
                      <p className="text-muted-foreground">Preview is unavailable in this browser.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={handleDownload}>Download PDF</Button>
                        <Button asChild size="sm" variant="outline">
                          <a href={pdfBlobUrl ?? downloadUrl} target="_blank" rel="noreferrer">Open in new tab</a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isImage && (
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setImageZoom((z) => Math.max(50, z - 10))}
                        disabled={imageZoom <= 50}
                      >
                        -
                      </Button>
                      <span className="min-w-12 text-center text-sm text-muted-foreground">
                        {imageZoom}%
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setImageZoom((z) => Math.min(300, z + 10))}
                        disabled={imageZoom >= 300}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setImageFullscreen((prev) => !prev)}
                    >
                      {imageFullscreen ? 'Exit full screen' : 'Full screen'}
                    </Button>
                  </div>
                  <div className={`flex ${imageFullscreen ? 'h-[75vh]' : 'h-[60vh]'} items-center justify-center overflow-auto rounded-md border bg-muted/10`}>
                    {imageLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">Loading image preview...</div>
                    ) : imagePreviewFailed || !imageBlobUrl ? (
                      <div className="p-4 text-sm text-muted-foreground">Preview is unavailable in this browser.</div>
                    ) : (
                      <img
                        src={imageBlobUrl}
                        alt={resource.title}
                        className="max-w-full max-h-full object-contain"
                        style={{ transform: `scale(${imageZoom / 100})`, transformOrigin: 'center' }}
                      />
                    )}
                  </div>
                </div>
              )}
              {isText && (
                <TextPreview url={apiDownloadPath} />
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Right column: Metadata ───────────────────────── */}
        {!isPreviewFullscreen && (
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

            {/* Report button - only visible when user is not the owner */}
            {user && resource.owner_id !== user.id && (
              <Button variant="outline" className="w-full" onClick={() => setReporting(true)}>
                Report Resource
              </Button>
            )}
            <div className="flex gap-2">
              {resource.type !== 'directory' && (
                <Button className="flex-1" size="lg" onClick={handleDownload}>
                  Download
                </Button>
              )}
              <Button
                size="lg"
                variant={isBookmarked ? 'secondary' : 'outline'}
                onClick={handleToggleBookmark}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
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

      {/* ── Resource tree ──────────────────────────────────── */}
      {treeData && (
        <Dirtree
          parents={treeData.parents}
          children={treeData.children}
          currentId={resource.id}
        />
      )}
      {treeLoading && (
        <div className="flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground">Loading resource tree...</p>
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

      {/* Report modal */}
      <AlertDialog open={reporting} onOpenChange={(open) => { if (!open) { setReporting(false); setReportReason(''); } }}>
        <AlertDialogContent>
          <form onSubmit={handleReportSubmit}>
            <AlertDialogHeader>
              <AlertDialogTitle>Report Resource</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for reporting this resource. It will be reviewed by our moderation team.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="report-reason">Reason</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe why you are reporting this resource..."
                rows={4}
                required
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={!reportReason.trim()}>Submit Report</Button>
            </AlertDialogFooter>
          </form>
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
