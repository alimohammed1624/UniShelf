import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { Resource } from '@/types';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/apiUtils';
import { assignTagsToResource, removeTagFromResource } from '../tags/tagSlice';

interface ResourceState {
  items: Resource[];
  archivedItems: Resource[];
  loading: boolean;
  error: string | null;
}

const initialState: ResourceState = {
  items: [],
  archivedItems: [],
  loading: false,
  error: null,
};

// Async Thunks
export interface SearchParams {
  q?: string;
  tags?: string;
}

export const fetchResources = createAsyncThunk<Resource[], SearchParams | void, { rejectValue: string }>(
  'resources/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.tags) searchParams.set('tags', params.tags);
      const qs = searchParams.toString();
      const response = await api.get<Resource[]>(`/resources${qs ? `?${qs}` : ''}`);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch resources'));
    }
  }
);

export const uploadResource = createAsyncThunk<Resource, FormData, { rejectValue: string }>(
  'resources/upload',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post<Resource>('/resources', formData);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Upload failed'));
    }
  }
);

export const downloadResource = createAsyncThunk<void, { id: number; title: string }, { rejectValue: string }>(
  'resources/download',
  async ({ id, title }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/resources/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || `resource-${id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Download failed'));
    }
  }
);

export const editResource = createAsyncThunk<Resource, { id: number; title: string; description: string; is_public: boolean }, { rejectValue: string }>(
  'resources/edit',
  async ({ id, title, description, is_public }, { rejectWithValue }) => {
    try {
      const response = await api.put<Resource>(`/resources/${id}`, { title, description, is_public });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Edit failed'));
    }
  }
);

export const deleteResource = createAsyncThunk<number, number, { rejectValue: string }>(
  'resources/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/resources/${id}`);
      return id;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Delete failed'));
    }
  }
);

/**
 * The caller's own archived resources, kept in `archivedItems` rather than
 * `items`. `items` is shared with search and bookmarks, which fetch it only when
 * it is empty — dropping archived rows in there would surface them on pages that
 * are supposed to show live resources only.
 */
export const fetchMyArchivedResources = createAsyncThunk<Resource[], void, { rejectValue: string }>(
  'resources/fetchMyArchived',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Resource[]>('/resources?include_archived=true&limit=200');
      // The endpoint returns active rows alongside archived ones; this slice only wants the latter.
      return response.data.filter((r) => r.is_archived);
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch archived resources'));
    }
  }
);

/**
 * Lift an archive. The backend decides whether the caller is allowed to —
 * owners may only restore their own SELF archives, moderation takedowns
 * require moderator+ — so a rejection here is a policy answer, not a bug.
 */
export const restoreResource = createAsyncThunk<Resource, number, { rejectValue: string }>(
  'resources/restore',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post<Resource>(`/resources/${id}/restore`);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Restore failed'));
    }
  }
);

export const submitLink = createAsyncThunk<Resource, { title: string; description: string; url: string; is_public: boolean }, { rejectValue: string }>(
  'resources/submitLink',
  async ({ title, description, url, is_public }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('url', url);
      formData.append('is_public', String(is_public));
      const response = await api.post<Resource>('/resources/link', formData);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to submit link'));
    }
  }
);

export const changeResourceFile = createAsyncThunk<Resource, { id: number; formData: FormData }, { rejectValue: string }>(
  'resources/changeFile',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await api.patch<Resource>(`/resources/${id}/file`, formData);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'File change failed'));
    }
  }
);

const resourceSlice = createSlice({
  name: 'resources',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchResources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchResources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch resources';
      })
      // Upload
      .addCase(uploadResource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadResource.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(uploadResource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Upload failed';
      })
      // Submit link
      .addCase(submitLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitLink.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(submitLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to submit link';
      })
      // Edit
      .addCase(editResource.fulfilled, (state, action) => {
        const index = state.items.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(editResource.rejected, (state, action) => {
        state.error = action.payload || 'Edit failed';
      })
      // Delete
      .addCase(deleteResource.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.payload);
      })
      .addCase(deleteResource.rejected, (state, action) => {
        state.error = action.payload || 'Delete failed';
      })
      // Archived listing
      .addCase(fetchMyArchivedResources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyArchivedResources.fulfilled, (state, action) => {
        state.loading = false;
        state.archivedItems = action.payload;
      })
      .addCase(fetchMyArchivedResources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch archived resources';
      })
      // Restore
      .addCase(restoreResource.fulfilled, (state, action) => {
        const index = state.items.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
        // No longer archived, so it leaves the archived listing.
        state.archivedItems = state.archivedItems.filter((r) => r.id !== action.payload.id);
      })
      .addCase(restoreResource.rejected, (state, action) => {
        state.error = action.payload || 'Restore failed';
      })
      // Change file
      .addCase(changeResourceFile.fulfilled, (state, action) => {
        const index = state.items.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(changeResourceFile.rejected, (state, action) => {
        state.error = action.payload || 'File change failed';
      })
      // Tag assignment (update resource tags in-place)
      .addCase(assignTagsToResource.fulfilled, (state, action) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.resourceId);
        if (idx !== -1) state.items[idx].tags = action.payload.tags;
      })
      .addCase(removeTagFromResource.fulfilled, (state, action) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.resourceId);
        if (idx !== -1) {
          state.items[idx].tags = state.items[idx].tags.filter((t) => t.id !== action.payload.tagId);
        }
      });
  },
});

export const { clearError } = resourceSlice.actions;
export default resourceSlice.reducer;
