'use client';

import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { ResourceTableCard } from '@/components/dashboard/resource-table-card';
import { AdvancedFilters, AdvancedFilterState } from '@/components/search/AdvancedFilters';
import {
  fetchResources,
  downloadResource,
  editResource,
  deleteResource,
  changeResourceFile,
} from '@/lib/features/resources/resourceSlice';
import {
  fetchTags,
  createTag,
  assignTagsToResource,
  removeTagFromResource,
} from '@/lib/features/tags/tagSlice';
import { toggleBookmarkAsync } from '@/lib/features/bookmarks/bookmarksSlice';
import { toast } from 'sonner';
import { UserPublicProfile } from '@/types';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SearchPage() {
  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>({
    searchQuery: '',
    resourceTypes: [],
    dateRange: null,
  });
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploaders, setUploaders] = useState<UserPublicProfile[]>([]);

  const dispatch = useAppDispatch();
  const { items: resources, loading } = useAppSelector((state) => state.resources);
  const { user } = useAppSelector((state) => state.auth);
  const { items: allTags } = useAppSelector((state) => state.tags);
  const bookmarkedResourceIds = useAppSelector((state) => state.bookmarks.ids);

  useEffect(() => {
    if (resources.length === 0) dispatch(fetchResources());
  }, [dispatch, resources.length]);

  useEffect(() => {
    if (allTags.length === 0) dispatch(fetchTags());
  }, [dispatch, allTags.length]);

  useEffect(() => {
    const uniqueIds = [
      ...new Set(resources.filter((r) => !r.is_anonymous).map((r) => r.uploader_id)),
    ];

    // If there are no non-anonymous resources, clear uploaders and exit early.
    if (uniqueIds.length === 0) {
      if (uploaders.length !== 0) {
        setUploaders([]);
      }
      return;
    }

    // Build a cache index from already-fetched uploader profiles.
    const existingIds = new Set(uploaders.map((u) => (u as any).id ?? (u as any).uploader_id));
    const missingIds = uniqueIds.filter((id) => !existingIds.has(id));

    // All required profiles are already cached; no need to refetch.
    if (missingIds.length === 0) {
      return;
    }

    Promise.all(
      missingIds.map((id) =>
        api
          .get<UserPublicProfile>(`/users/${id}`)
          .then((r) => r.data)
          .catch(() => null),
      ),
    ).then((profiles) => {
      const newProfiles = profiles.filter(Boolean) as UserPublicProfile[];
      if (newProfiles.length === 0) return;

      // Merge newly fetched profiles into the existing cache, deduplicating by id.
      setUploaders((prev) => {
        const byId = new Map<string | number, UserPublicProfile>();

        for (const p of prev) {
          const key = (p as any).id ?? (p as any).uploader_id;
          if (key != null && !byId.has(key)) {
            byId.set(key, p);
          }
        }

        for (const p of newProfiles) {
          const key = (p as any).id ?? (p as any).uploader_id;
          if (key != null && !byId.has(key)) {
            byId.set(key, p);
          }
        }

        return Array.from(byId.values());
      });
    });
  }, [resources, uploaders]);

  // Filter resources based on advanced filters
  const filtered = resources.filter((r) => {
    // Search query filter
    if (advancedFilters.searchQuery) {
      const q = advancedFilters.searchQuery.toLowerCase();
      const matchesSearch =
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.filename?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Resource type filter
    if (advancedFilters.resourceTypes.length > 0) {
      const matchesType = advancedFilters.resourceTypes.some((typeId) => {
        if (typeId === 'pdf' && r.type === 'application/pdf') return true;
        if (typeId === 'video' && r.type?.startsWith('video/')) return true;
        if (typeId === 'image' && r.type?.startsWith('image/')) return true;
        if (typeId === 'code' && r.type?.startsWith('text/')) return true;
        if (typeId === 'link' && r.type === 'link') return true;
        return false;
      });
      if (!matchesType) return false;
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const matchesTags = selectedTags.every((tagName) =>
        r.tags.some((t) => t.name.toLowerCase() === tagName.toLowerCase())
      );
      if (!matchesTags) return false;
    }

    // Date range filter
    if (advancedFilters.dateRange) {
      const resourceDate = new Date(r.created_at).toISOString().split('T')[0];
      const fromDate = advancedFilters.dateRange.from;
      const toDate = advancedFilters.dateRange.to;
      
      if (fromDate && resourceDate < fromDate) return false;
      if (toDate && resourceDate > toDate) return false;
    }

    return true;
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

  const handleToggleBookmark = (resourceId: number, resourceTitle: string) => {
    const isBookmarked = bookmarkedResourceIds.includes(resourceId);
    dispatch(toggleBookmarkAsync(resourceId));
    toast.success(
      isBookmarked
        ? `Removed "${resourceTitle}" from bookmarks`
        : `Added "${resourceTitle}" to bookmarks`
    );
  };

  const handleClearAllFilters = () => {
    setAdvancedFilters({
      searchQuery: '',
      resourceTypes: [],
      dateRange: null,
    });
    setSelectedTags([]);
  };

  const handleTagToggle = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Search Resources</h1>
        <p className="text-muted-foreground">
          Find academic materials with advanced filtering and search
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <AdvancedFilters
            filters={advancedFilters}
            onFilterChange={setAdvancedFilters}
            onClearAll={handleClearAllFilters}
            allTags={allTags}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search Input */}
          <Input
            type="text"
            placeholder="Search by title, description, or filename..."
            value={advancedFilters.searchQuery}
            onChange={(e) =>
              setAdvancedFilters({ ...advancedFilters, searchQuery: e.target.value })
            }
            className="text-base"
            autoFocus
          />

          {/* Results Info */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length === 0
                ? 'No resources found'
                : `${filtered.length} resource${filtered.length !== 1 ? 's' : ''} found`}
            </p>
            {(advancedFilters.searchQuery ||
              advancedFilters.resourceTypes.length > 0 ||
              selectedTags.length > 0 ||
              advancedFilters.dateRange) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFilters}
                className="text-xs"
              >
                Reset filters
              </Button>
            )}
          </div>

          {/* Resources List */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No resources match your filters</p>
              <Button
                variant="outline"
                onClick={handleClearAllFilters}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
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
              bookmarkedResourceIds={bookmarkedResourceIds}
              onToggleBookmark={handleToggleBookmark}
              storageKey="viewMode:search"
            />
          )}
        </div>
      </div>
    </div>
  );
}
