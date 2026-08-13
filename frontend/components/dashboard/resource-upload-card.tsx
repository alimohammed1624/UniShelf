'use client';

import { FormEvent, RefObject, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

type UploadTab = 'file' | 'link' | 'directory';

const TAB_LABELS: Record<UploadTab, string> = {
  file: 'Upload File',
  link: 'Add Link',
  directory: 'New Folder',
};

const SUBMIT_LABELS: Record<UploadTab, string> = {
  file: 'Upload',
  link: 'Add Link',
  directory: 'Create Folder',
};

interface ResourceUploadCardProps {
  title: string;
  description: string;
  file: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  linkUrl: string;
  visibility: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onRemoveFile: () => void;
  onLinkUrlChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onSubmitFile: (e: FormEvent) => void;
  onSubmitLink: (e: FormEvent) => void;
  onSubmitDirectory?: (e: FormEvent) => void;
  tabs?: UploadTab[];
  cardTitle?: string;
  cardDescription?: string;
}

export function ResourceUploadCard({
  title,
  description,
  file,
  fileInputRef,
  linkUrl,
  visibility,
  onTitleChange,
  onDescriptionChange,
  onFileChange,
  onRemoveFile,
  onLinkUrlChange,
  onVisibilityChange,
  onSubmitFile,
  onSubmitLink,
  onSubmitDirectory,
  tabs = ['file', 'link'],
  cardTitle = 'Add Resource',
  cardDescription = 'Share notes, assignments, study material, or a web link.',
}: ResourceUploadCardProps) {
  const [tab, setTab] = useState<UploadTab>(tabs[0]);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);
  const fileSizeLabel = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '';
  const visibilityLabel =
    VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label ?? 'Select visibility';

  useEffect(() => {
    if (!visibilityOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!visibilityRef.current?.contains(e.target as Node)) {
        setVisibilityOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisibilityOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visibilityOpen]);

  const handleSubmit = (e: FormEvent) => {
    if (tab === 'file') {
      onSubmitFile(e);
    } else if (tab === 'link') {
      onSubmitLink(e);
    } else {
      onSubmitDirectory?.(e);
    }
  };

  const canSubmit =
    tab === 'file' ? !!file : tab === 'link' ? !!linkUrl.trim() : !!title.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
        <div className="flex gap-1 mt-2 border rounded-md p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
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
          <div className="space-y-2">
            <Label htmlFor="resource-visibility">Visibility</Label>
            <div className="relative" ref={visibilityRef}>
              <button
                type="button"
                id="resource-visibility"
                onClick={() => setVisibilityOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={visibilityOpen}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {visibilityLabel}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              {visibilityOpen ? (
                <div
                  role="listbox"
                  className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border bg-popover p-1 shadow-md"
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={option.value === visibility}
                      onClick={() => {
                        onVisibilityChange(option.value);
                        setVisibilityOpen(false);
                      }}
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
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
          ) : tab === 'link' ? (
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
          ) : (
            <p key="directory-section" className="text-sm text-muted-foreground">
              Creates an empty folder. You can add files and subfolders to it afterwards.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {SUBMIT_LABELS[tab]}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
