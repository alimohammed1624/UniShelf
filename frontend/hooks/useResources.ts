import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../lib/hooks';
import {
  fetchResources as fetchResourcesAction,
  uploadResource as uploadResourceAction,
  downloadResource as downloadResourceAction,
  editResource as editResourceAction,
  deleteResource as deleteResourceAction,
  changeResourceFile as changeResourceFileAction
} from '../lib/features/resources/resourceSlice';
import {
  fetchTags as fetchTagsAction,
  createTag as createTagAction,
  assignTagsToResource as assignTagsAction,
  removeTagFromResource as removeTagAction,
} from '../lib/features/tags/tagSlice';
import { logout as logoutAction } from '../lib/features/auth/authSlice';

export const useResources = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items: resources, loading, error } = useAppSelector((state) => state.resources);
  const { items: allTags } = useAppSelector((state) => state.tags);

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchResourcesAction());
    dispatch(fetchTagsAction());
  }, [dispatch]);

  const fetchResources = (params?: { q?: string; tags?: string }) => {
    dispatch(fetchResourcesAction(params));
  };

  const uploadResource = async (title: string, description: string) => {
    if (!file) return false;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', file);
    formData.append('is_public', 'true');

    try {
      const promise = dispatch(uploadResourceAction(formData)).unwrap();
      
      toast.promise(promise, {
        loading: 'Uploading...',
        success: 'Upload successful',
        error: (err) => typeof err === 'string' ? err : 'Upload failed'
      });
      
      await promise;
      
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return true;
    } catch {
      return false;
    }
  };

  const downloadResource = async (resourceId: number, title: string) => {
    try {
      const promise = dispatch(downloadResourceAction({ id: resourceId, title })).unwrap();
      
      toast.promise(promise, {
        loading: 'Downloading...',
        success: 'Download started',
        error: (err) => typeof err === 'string' ? err : 'Download failed'
      });
      
      await promise;
    } catch {
      // Error handled by toast
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const editResource = async (resourceId: number, title: string, description: string, visibility: string) => {
    const is_public = visibility === 'public';

    try {
      const promise = dispatch(editResourceAction({ id: resourceId, title, description, is_public })).unwrap();

      toast.promise(promise, {
        loading: 'Saving changes...',
        success: 'Resource updated',
        error: (err) => typeof err === 'string' ? err : 'Edit failed'
      });

      await promise;
      return true;
    } catch {
      return false;
    }
  };

  const deleteResourceById = async (resourceId: number) => {
    try {
      const promise = dispatch(deleteResourceAction(resourceId)).unwrap();

      toast.promise(promise, {
        loading: 'Deleting...',
        success: 'Resource deleted',
        error: (err) => typeof err === 'string' ? err : 'Delete failed'
      });

      await promise;
      return true;
    } catch {
      return false;
    }
  };

  const changeFile = async (resourceId: number, newFile: File) => {
    const formData = new FormData();
    formData.append('file', newFile);

    try {
      const promise = dispatch(changeResourceFileAction({ id: resourceId, formData })).unwrap();

      toast.promise(promise, {
        loading: 'Replacing file...',
        success: 'File replaced',
        error: (err) => typeof err === 'string' ? err : 'File change failed'
      });

      await promise;
      return true;
    } catch {
      return false;
    }
  };

  const createTag = async (name: string) => {
    try {
      const result = await dispatch(createTagAction({ name })).unwrap();
      return result;
    } catch {
      toast.error('Failed to create tag');
      return null;
    }
  };

  const assignTags = async (resourceId: number, tagIds: number[]) => {
    try {
      const promise = dispatch(assignTagsAction({ resourceId, tagIds })).unwrap();
      toast.promise(promise, {
        loading: 'Saving tags...',
        success: 'Tags updated',
        error: (err) => typeof err === 'string' ? err : 'Failed to assign tags'
      });
      await promise;
      return true;
    } catch {
      return false;
    }
  };

  const removeTag = async (resourceId: number, tagId: number) => {
    try {
      const promise = dispatch(removeTagAction({ resourceId, tagId })).unwrap();
      toast.promise(promise, {
        loading: 'Removing tag...',
        success: 'Tag removed',
        error: (err) => typeof err === 'string' ? err : 'Failed to remove tag'
      });
      await promise;
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    dispatch(logoutAction());
    router.push('/login');
    toast.success('Logged out successfully');
  };

  return {
    resources,
    loading,
    error,
    allTags,
    file,
    setFile,
    fileInputRef,
    fetchResources,
    uploadResource,
    downloadResource,
    editResource,
    deleteResource: deleteResourceById,
    changeFile,
    createTag,
    assignTags,
    removeTag,
    removeFile,
  };
};
