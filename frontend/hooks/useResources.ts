import { useState, useRef, useEffect } from 'react';
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

export const useResources = () => {
  const dispatch = useAppDispatch();
  const { items: resources, loading, error } = useAppSelector((state) => state.resources);
  
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchResourcesAction());
  }, [dispatch]);

  const fetchResources = () => {
    dispatch(fetchResourcesAction());
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

  return {
    resources,
    loading,
    error,
    file,
    setFile,
    fileInputRef,
    fetchResources,
    uploadResource,
    downloadResource,
    editResource,
    deleteResource: deleteResourceById,
    changeFile,
    removeFile,
  };
};
