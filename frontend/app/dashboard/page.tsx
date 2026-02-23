'use client';

import { useState } from 'react';
import { useResources } from '@/hooks/useResources';
import { Button } from '@/components/ui/button';
import { LogoutConfirmDialog } from '@/components/dashboard/logout-confirm-dialog';
import { ResourceUploadCard } from '@/components/dashboard/resource-upload-card';
import { ResourceTableCard } from '@/components/dashboard/resource-table-card';

export default function Dashboard() {
  const { 
    resources, 
    loading, 
    file, 
    setFile, 
    fileInputRef, 
    uploadResource, 
    downloadResource,
    editResource,
    deleteResource,
    changeFile,
    removeFile, 
    logout 
  } = useResources();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const success = await uploadResource(title, description);
    if (success) {
      setTitle('');
      setDescription('');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,oklch(0.97_0.01_230),oklch(0.94_0.02_230))] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white/70 px-5 py-4 shadow-sm backdrop-blur-sm">
          <h1 className="text-2xl font-semibold md:text-3xl">UniShelf Dashboard</h1>
          <Button variant="destructive" onClick={handleLogoutClick}>
            Logout
          </Button>
        </div>

        <LogoutConfirmDialog
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          onConfirm={logout}
        />

        <ResourceUploadCard
          title={title}
          description={description}
          file={file}
          fileInputRef={fileInputRef}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onFileChange={setFile}
          onRemoveFile={removeFile}
          onSubmit={handleUpload}
        />

        <ResourceTableCard
          resources={resources}
          loading={loading}
          onDownload={downloadResource}
          onEdit={editResource}
          onDelete={deleteResource}
          onChangeFile={changeFile}
        />
      </div>
    </main>
  );
}
