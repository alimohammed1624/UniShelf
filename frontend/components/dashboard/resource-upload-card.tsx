import { FormEvent, RefObject } from 'react';
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
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onRemoveFile: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function ResourceUploadCard({
  title,
  description,
  file,
  fileInputRef,
  onTitleChange,
  onDescriptionChange,
  onFileChange,
  onRemoveFile,
  onSubmit,
}: ResourceUploadCardProps) {
  const fileSizeLabel = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Resource</CardTitle>
        <CardDescription>Share notes, assignments, or study material.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
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
          <div className="flex justify-end">
            <Button type="submit" disabled={!file}>
              Upload
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
