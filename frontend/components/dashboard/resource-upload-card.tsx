'use client';

import { FormEvent, RefObject, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ResourceUploadCardProps {
  title: string;
  description: string;
  file: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  linkUrl: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onRemoveFile: () => void;
  onLinkUrlChange: (value: string) => void;
  onSubmitFile: (e: FormEvent) => void;
  onSubmitLink: (e: FormEvent) => void;
}

export function ResourceUploadCard({
  title,
  description,
  file,
  fileInputRef,
  linkUrl,
  onTitleChange,
  onDescriptionChange,
  onFileChange,
  onRemoveFile,
  onLinkUrlChange,
  onSubmitFile,
  onSubmitLink,
}: ResourceUploadCardProps) {
  const [tab, setTab] = useState<'file' | 'link'>('file');
  const fileSizeLabel = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '';

  const handleSubmit = (e: FormEvent) => {
    if (tab === 'file') {
      onSubmitFile(e);
    } else {
      onSubmitLink(e);
    }
  };

  const canSubmit = tab === 'file' ? !!file : !!linkUrl.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Resource</CardTitle>
        <CardDescription>Share notes, assignments, study material, or a web link.</CardDescription>
        <div className="flex gap-1 mt-2 border rounded-md p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              tab === 'file' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              tab === 'link' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            Add Link
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shared fields — always mounted, never toggled */}
          <div className="space-y-2">
            <Label htmlFor="resource-title">Title</Label>
            <Input
              id="resource-title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea
              id="resource-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={4}
            />
          </div>

          {/* Tab-specific field */}
          {tab === 'file' ? (
            <div key="file-section" className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)}
                className="sr-only"
              />
              <div className="rounded-lg border border-dashed bg-muted/35 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {file ? file.name : 'No file selected'}
                    </p>
                    {fileSizeLabel ? (
                      <p className="text-xs text-muted-foreground">{fileSizeLabel}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" asChild>
                      <label htmlFor="file" className="cursor-pointer">
                        Choose File
                      </label>
                    </Button>
                    {file ? (
                      <Button type="button" size="sm" variant="ghost" onClick={onRemoveFile}>
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div key="link-section" className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => onLinkUrlChange(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {tab === 'file' ? 'Upload' : 'Add Link'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
