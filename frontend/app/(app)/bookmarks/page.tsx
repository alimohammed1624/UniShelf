'use client';

import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { ResourceTableCard } from '@/components/dashboard/resource-table-card';
import {
  downloadResource,
  editResource,
  deleteResource,
  changeResourceFile,
} from '@/lib/features/resources/resourceSlice';
import { toast } from 'sonner';

export default function BookmarksPage() {
  const dispatch = useAppDispatch();
  const { items: resources, loading } = useAppSelector((state) => state.resources);
  const { user } = useAppSelector((state) => state.auth);
  const bookmarkIds = useAppSelector((state) => state.bookmarks.ids);

  const bookmarked = resources.filter((r) => bookmarkIds.includes(r.id));

  const handleDownload = async (id: number, title: string) => {
    const promise = dispatch(downloadResource({ id, title })).unwrap();
    toast.promise(promise, { loading: 'Downloading...', success: 'Download started', error: 'Download failed' });
    await promise.catch(() => {});
  };

  const handleEdit = async (id: number, title: string, desc: string, visibility: string) => {
    try {
      const promise = dispatch(editResource({ id, title, description: desc, is_public: visibility === 'public' })).unwrap();
      toast.promise(promise, { loading: 'Saving...', success: 'Resource updated', error: 'Edit failed' });
      await promise;
      return true;
    } catch { return false; }
  };

  const handleDelete = async (id: number) => {
    try {
      const promise = dispatch(deleteResource(id)).unwrap();
      toast.promise(promise, { loading: 'Deleting...', success: 'Resource deleted', error: 'Delete failed' });
      await promise;
      return true;
    } catch { return false; }
  };

  const handleChangeFile = async (id: number, newFile: File) => {
    const formData = new FormData();
    formData.append('file', newFile);
    try {
      const promise = dispatch(changeResourceFile({ id, formData })).unwrap();
      toast.promise(promise, { loading: 'Replacing...', success: 'File replaced', error: 'File change failed' });
      await promise;
      return true;
    } catch { return false; }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bookmarks</h1>
      {bookmarked.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">No bookmarks yet. Save a resource to see it here.</p>
      ) : (
        <ResourceTableCard
          resources={bookmarked}
          loading={loading}
          currentUserId={user?.id ?? null}
          currentUserRole={user?.role ?? 0}
          onDownload={handleDownload}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onChangeFile={handleChangeFile}
        />
      )}
    </div>
  );
}
