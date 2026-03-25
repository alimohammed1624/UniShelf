import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { Resource } from '@/types';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/apiUtils';
import { assignTagsToResource, removeTagFromResource } from '../tags/tagSlice';

interface ResourceState {
  items: Resource[];
  loading: boolean;
  error: string | null;
}

const initialState: ResourceState = {
  items: [],
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
