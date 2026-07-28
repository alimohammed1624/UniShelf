'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  fetchTagSuggestions,
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

const STORAGE_KEY = 'search:filters';

const EMPTY_FILTERS: AdvancedFilterState = { searchQuery: '', resourceTypes: [], dateRange: null };

function readStorage(): { filters: AdvancedFilterState; tags: string[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeStorage(filters: AdvancedFilterState, tags: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, tags }));
  } catch {}
}

function clearStorage() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tracks whether initial state was restored from sessionStorage (not URL),
  // so we can sync it to the URL on the first effect run.
  const restoredFromStorage = useRef(false);

  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(() => {
    const q = searchParams.get('q');
    const types = searchParams.get('types');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const tags = searchParams.get('tags');

    if (q || types || tags || from || to) {
      return {
        searchQuery: q ?? '',
        resourceTypes: types ? types.split(',') : [],
        dateRange: from || to ? { from: from ?? '', to: to ?? '' } : null,
      };
    }

    const stored = readStorage();
    if (stored) {
      restoredFromStorage.current = true;
      return stored.filters;
    }

    return EMPTY_FILTERS;
  });

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = searchParams.get('tags');
    if (tags) return tags.split(',');
    // readStorage() again is fine — it's cheap and avoids cross-initializer coupling
    return readStorage()?.tags ?? [];
  });

  const [uploaders, setUploaders] = useState<UserPublicProfile[]>([]);

  const dispatch = useAppDispatch();
  const { items: resources, loading } = useAppSelector((state) => state.resources);
  const { user } = useAppSelector((state) => state.auth);
  const {
    items: allTags,
    suggestions: suggestedTags,
    suggestionsLoading,
  } = useAppSelector((state) => state.tags);
  const bookmarkedResourceIds = useAppSelector((state) => state.bookmarks.ids);

  // If we restored from sessionStorage (URL had no params), push state into the URL so
  // the address bar reflects the active filters.
  useEffect(() => {
    if (!restoredFromStorage.current) return;
    const params = buildParams(advancedFilters, selectedTags);
    const qs = params.toString();
    if (qs) router.replace(`${pathname}?${qs}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resources.length === 0) dispatch(fetchResources());
  }, [dispatch, resources.length]);

  useEffect(() => {
    if (allTags.length === 0) dispatch(fetchTags());
  }, [dispatch, allTags.length]);

  // AI tag suggestions. Debounced on the query because each miss costs an
  // upstream API call; the initial (empty-query) load fires immediately.
  // selectedTags is a dependency so picking a chip re-ranks the next round.
  useEffect(() => {
    const query = advancedFilters.searchQuery.trim();
    if (query.length > 0 && query.length < 3) return; // too little signal to pay for

    const handle = setTimeout(() => {
      dispatch(fetchTagSuggestions({ query, selectedTags }));
    }, query ? 600 : 0);

    return () => clearTimeout(handle);
  }, [dispatch, advancedFilters.searchQuery, selectedTags]);

  useEffect(() => {
    const uniqueIds = [
      ...new Set(resources.filter((r) => !r.is_anonymous).map((r) => r.uploader_id)),
    ];

    if (uniqueIds.length === 0) {
      if (uploaders.length !== 0) setUploaders([]);
      return;
    }

    const existingIds = new Set(uploaders.map((u) => (u as any).id ?? (u as any).uploader_id));
    const missingIds = uniqueIds.filter((id) => !existingIds.has(id));

    if (missingIds.length === 0) return;

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

      setUploaders((prev) => {
        const byId = new Map<string | number, UserPublicProfile>();
        for (const p of prev) {
          const key = (p as any).id ?? (p as any).uploader_id;
          if (key != null && !byId.has(key)) byId.set(key, p);
        }
        for (const p of newProfiles) {
          const key = (p as any).id ?? (p as any).uploader_id;
          if (key != null && !byId.has(key)) byId.set(key, p);
        }
        return Array.from(byId.values());
      });
    });
  }, [resources, uploaders]);

  function buildParams(filters: AdvancedFilterState, tags: string[]) {
    const params = new URLSearchParams();
    if (filters.searchQuery) params.set('q', filters.searchQuery);
    if (filters.resourceTypes.length > 0) params.set('types', filters.resourceTypes.join(','));
    if (tags.length > 0) params.set('tags', tags.join(','));
    if (filters.dateRange?.from) params.set('from', filters.dateRange.from);
    if (filters.dateRange?.to) params.set('to', filters.dateRange.to);
    return params;
  }

  function syncFilters(filters: AdvancedFilterState, tags: string[]) {
    const params = buildParams(filters, tags);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    if (qs) {
      writeStorage(filters, tags);
    } else {
      clearStorage();
    }
  }

  const filtered = resources.filter((r) => {
    if (advancedFilters.searchQuery) {
      const q = advancedFilters.searchQuery.toLowerCase();
      const matchesSearch =
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.filename?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

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

    if (selectedTags.length > 0) {
      const matchesTags = selectedTags.every((tagName) =>
        r.tags.some((t) => t.name.toLowerCase() === tagName.toLowerCase())
      );
      if (!matchesTags) return false;
    }

    if (advancedFilters.dateRange) {
      // Compare against the user's local calendar date. `toISOString()` converts
      // the timestamp to UTC first, which can move resources created near
      // midnight into the previous day (for example, July 14 in India becomes
      // July 13 in UTC).
      const resourceDate = getLocalDateKey(r.created_at);
      const fromDate = advancedFilters.dateRange.from;
      const toDate = advancedFilters.dateRange.to;
      if (fromDate && resourceDate < fromDate) return false;
      if (toDate && resourceDate > toDate) return false;
    }

    return true;
  });

  function getLocalDateKey(timestamp: string) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  const handleFilterChange = (filters: AdvancedFilterState) => {
    setAdvancedFilters(filters);
    syncFilters(filters, selectedTags);
  };

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(newTags);
    syncFilters(advancedFilters, newTags);
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    syncFilters(advancedFilters, []);
  };

  const handleClearAllFilters = () => {
    setAdvancedFilters(EMPTY_FILTERS);
    setSelectedTags([]);
    syncFilters(EMPTY_FILTERS, []);
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar Filters */}
      <div>
        <AdvancedFilters
          filters={advancedFilters}
          onFilterChange={handleFilterChange}
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearTags={handleClearTags}
          suggestedTags={suggestedTags}
          suggestionsLoading={suggestionsLoading}
        />
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold mb-2">Search Resources</h1>
        <p className="text-muted-foreground">
          Find academic materials with advanced filtering and search
        </p>
          {/* Search Input */}
          <Input
            type="text"
            placeholder="Search by title, description, or filename..."
            value={advancedFilters.searchQuery}
            onChange={(e) =>
              handleFilterChange({ ...advancedFilters, searchQuery: e.target.value })
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
              <Button variant="outline" onClick={handleClearAllFilters}>
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
              hideActions
            />
          )}
        </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
