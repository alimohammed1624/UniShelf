import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Resource } from '@/types';

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
export const fetchResources = createAsyncThunk<Resource[], void, { rejectValue: string }>(
  'resources/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.detail || 'Failed to fetch resources');
      }

      return await response.json();
    } catch {
      return rejectWithValue('Network error');
    }
  }
);

export const uploadResource = createAsyncThunk<Resource, FormData, { rejectValue: string }>(
  'resources/upload',
  async (formData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.detail || 'Upload failed');
      }

      return await response.json();
    } catch {
      return rejectWithValue('Network error');
    }
  }
);

export const downloadResource = createAsyncThunk<void, { id: number; title: string }, { rejectValue: string }>(
  'resources/download',
  async ({ id, title }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return rejectWithValue('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || `resource-${id}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      return rejectWithValue('Network error');
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
        state.items.push(action.payload); // Optimistic update or just append result
      })
      .addCase(uploadResource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Upload failed';
      });
  },
});

export const { clearError } = resourceSlice.actions;
export default resourceSlice.reducer;
