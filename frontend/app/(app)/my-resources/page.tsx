'use client';

import { useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { ResourceUploadCard } from '@/components/dashboard/resource-upload-card';
import { ResourceTableCard } from '@/components/dashboard/resource-table-card';
import {
  uploadResource,
  downloadResource,
  editResource,
  deleteResource,
  changeResourceFile,
} from '@/lib/features/resources/resourceSlice';
import { toast } from 'sonner';

export default function MyResourcesPage() {
  const dispatch = useAppDispatch();
  const { items: resources, loading } = useAppSelector((state) => state.resources);
  const { user } = useAppSelector((state) => state.auth);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myResources = resources.filter((r) => r.owner_id === user?.id);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    formData.append('is_public', 'true');

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
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      // handled by toast
    }
  };

  const handleDownload = async (id: number, resourceTitle: string) => {
    const promise = dispatch(downloadResource({ id, title: resourceTitle })).unwrap();
    toast.promise(promise, { loading: 'Downloading...', success: 'Download started', error: 'Download failed' });
    await promise.catch(() => {});
  };

  const handleEdit = async (id: number, t: string, desc: string, visibility: string) => {
    try {
      const promise = dispatch(editResource({ id, title: t, description: desc, is_public: visibility === 'public' })).unwrap();
      toast.promise(promise, { loading: 'Saving...', success: 'Resource updated', error: 'Edit failed' });
      await promise;
      return true;
    } catch {
      return false;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const promise = dispatch(deleteResource(id)).unwrap();
      toast.promise(promise, { loading: 'Deleting...', success: 'Resource deleted', error: 'Delete failed' });
      await promise;
      return true;
    } catch {
      return false;
    }
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Resources</h1>
      <ResourceUploadCard
        title={title}
        description={description}
        file={file}
        fileInputRef={fileInputRef}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onFileChange={setFile}
        onRemoveFile={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        onSubmit={handleUpload}
      />
      <ResourceTableCard
        resources={myResources}
        loading={loading}
        currentUserId={user?.id ?? null}
        currentUserRole={user?.role ?? 0}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onChangeFile={handleChangeFile}
      />
    </div>
  );
}
