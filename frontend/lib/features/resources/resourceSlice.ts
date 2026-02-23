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

export const editResource = createAsyncThunk<Resource, { id: number; formData: FormData }, { rejectValue: string }>(
  'resources/edit',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.detail || 'Edit failed');
      }

      return await response.json();
    } catch {
      return rejectWithValue('Network error');
    }
  }
);

export const deleteResource = createAsyncThunk<number, number, { rejectValue: string }>(
  'resources/delete',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.detail || 'Delete failed');
      }

      return id;
    } catch {
      return rejectWithValue('Network error');
    }
  }
);

export const changeResourceFile = createAsyncThunk<Resource, { id: number; formData: FormData }, { rejectValue: string }>(
  'resources/changeFile',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources/${id}/file`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.detail || 'File change failed');
      }

      return await response.json();
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
      });
  },
});

export const { clearError } = resourceSlice.actions;
export default resourceSlice.reducer;
