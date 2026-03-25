'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ResourceTableCard } from '@/components/dashboard/resource-table-card';
import {
  fetchResources,
  downloadResource,
  editResource,
  deleteResource,
  changeResourceFile,
} from '@/lib/features/resources/resourceSlice';
import {
  createTag,
  assignTagsToResource,
  removeTagFromResource,
} from '@/lib/features/tags/tagSlice';
import { toast } from 'sonner';
import { UserPublicProfile } from '@/types';
import api from '@/lib/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagChips, setTagChips] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [userChips, setUserChips] = useState<string[]>([]);
  const [uploaders, setUploaders] = useState<UserPublicProfile[]>([]);

  const dispatch = useAppDispatch();
  const { items: resources, loading } = useAppSelector((state) => state.resources);
  const { user } = useAppSelector((state) => state.auth);
  const { items: allTags } = useAppSelector((state) => state.tags);

  useEffect(() => {
    if (resources.length === 0) dispatch(fetchResources());
  }, [dispatch, resources.length]);

  useEffect(() => {
    const uniqueIds = [
      ...new Set(resources.filter((r) => !r.is_anonymous).map((r) => r.uploader_id)),
    ];
    if (uniqueIds.length === 0) return;
    Promise.all(
      uniqueIds.map((id) =>
        api.get<UserPublicProfile>(`/users/${id}`)
          .then((r) => r.data)
          .catch(() => null)
      )
    ).then((profiles) => setUploaders(profiles.filter(Boolean) as UserPublicProfile[]));
  }, [resources]);

  const addTagChip = () => {
    const val = tagInput.trim();
    if (val && !tagChips.includes(val)) setTagChips((prev) => [...prev, val]);
    setTagInput('');
  };

  const addUserChip = () => {
    const val = userInput.trim();
    if (val && !userChips.includes(val)) setUserChips((prev) => [...prev, val]);
    setUserInput('');
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagChip(); }
    else if (e.key === 'Backspace' && !tagInput) setTagChips((prev) => prev.slice(0, -1));
  };

  const handleUserKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addUserChip(); }
    else if (e.key === 'Backspace' && !userInput) setUserChips((prev) => prev.slice(0, -1));
  };

  const filtered = resources.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q);

    const matchesTags =
      tagChips.length === 0 ||
      tagChips.every((chip) =>
        r.tags.some((t) => t.name.toLowerCase().includes(chip.toLowerCase()))
      );

    const matchesUser =
      userChips.length === 0 ||
      (() => {
        if (r.is_anonymous) return false;
        const uploader = uploaders.find((u) => u.id === r.uploader_id);
        if (!uploader) return false;
        return userChips.some((chip) =>
          uploader.full_name.toLowerCase().includes(chip.toLowerCase())
        );
      })();

    return matchesQuery && matchesTags && matchesUser;
  });

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
      <h1 className="text-2xl font-semibold">Search</h1>

      <Input
        type="text"
        placeholder="Search resources by title or description..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Filter by tag</p>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 min-h-10 focus-within:ring-1 focus-within:ring-ring">
          {tagChips.map((chip) => (
            <Badge key={chip} variant="secondary" className="gap-1 pr-1">
              {chip}
              <button
                type="button"
                onClick={() => setTagChips((prev) => prev.filter((c) => c !== chip))}
                className="rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-[140px]"
            placeholder={tagChips.length === 0 ? 'Type a tag and press Enter...' : 'Add another...'}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTagChip}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Filter by uploader</p>
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 min-h-10 focus-within:ring-1 focus-within:ring-ring">
          {userChips.map((chip) => (
            <Badge key={chip} variant="secondary" className="gap-1 pr-1">
              {chip}
              <button
                type="button"
                onClick={() => setUserChips((prev) => prev.filter((c) => c !== chip))}
                className="rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-[140px]"
            placeholder={userChips.length === 0 ? 'Type a name and press Enter...' : 'Add another...'}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleUserKeyDown}
            onBlur={addUserChip}
          />
        </div>
      </div>

      <ResourceTableCard
        resources={filtered}
        loading={loading}
        currentUserId={user?.id ?? null}
        currentUserRole={user?.role ?? 0}
        allTags={allTags}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onChangeFile={handleChangeFile}
        onCreateTag={handleCreateTag}
        onAssignTags={handleAssignTags}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
}
