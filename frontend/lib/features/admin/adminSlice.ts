import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/apiUtils';

interface AdminState {
  users: Array<{
    id: number;
    email: string;
    full_name: string | null;
    role: number;
    is_active: boolean;
    created_at: string;
  }>;
  resources: Array<{
    id: number;
    title: string;
    filename: string | null;
    uploader_id: number;
    owner_id: number;
    is_public: boolean;
    is_archived: boolean;
    created_at: string;
    tags: Array<{ id: number; name: string }>;
  }>;
  usersLoading: boolean;
  resourcesLoading: boolean;
  usersError: string | null;
  resourcesError: string | null;
}

const initialState: AdminState = {
  users: [],
  resources: [],
  usersLoading: false,
  resourcesLoading: false,
  usersError: null,
  resourcesError: null,
};

export const fetchUsers = createAsyncThunk<
  Array<{ id: number; email: string; full_name: string | null; role: number; is_active: boolean; created_at: string }>,
  void,
  { rejectValue: string }
>('admin/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<Array<{ id: number; email: string; full_name: string | null; role: number; is_active: boolean; created_at: string }>>('/admin/users');
    return response.data;
  } catch (err) {
    const error = err as AxiosError<{ detail: unknown }>;
    return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch users'));
  }
});

export const fetchResources = createAsyncThunk<
  Array<{ id: number; title: string; filename: string | null; uploader_id: number; owner_id: number; is_public: boolean; is_archived: boolean; created_at: string; tags: Array<{ id: number; name: string }> }>,
  { includeArchived?: boolean },
  { rejectValue: string }
>('admin/fetchResources', async ({ includeArchived = false } = {}, { rejectWithValue }) => {
  try {
    const response = await api.get<Array<{ id: number; title: string; filename: string | null; uploader_id: number; owner_id: number; is_public: boolean; is_archived: boolean; created_at: string; tags: Array<{ id: number; name: string }> }>>('/admin/resources', {
      params: { include_archived: includeArchived },
    });
    return response.data;
  } catch (err) {
    const error = err as AxiosError<{ detail: unknown }>;
    return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch resources'));
  }
});

export const deleteResource = createAsyncThunk<
  number, // resource id that was deleted
  number, // resourceId parameter
  { rejectValue: string }
>('admin/deleteResource', async (resourceId, { rejectWithValue }) => {
  try {
    await api.delete(`/admin/resources/${resourceId}`);
    return resourceId;
  } catch (err) {
    const error = err as AxiosError<{ detail: unknown }>;
    return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to delete resource'));
  }
});

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearUsersError: (state) => {
      state.usersError = null;
    },
    clearResourcesError: (state) => {
      state.resourcesError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        state.usersLoading = true;
        state.usersError = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.usersLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.usersError = action.payload || 'Failed to fetch users';
      })
      // fetchResources
      .addCase(fetchResources.pending, (state) => {
        state.resourcesLoading = true;
        state.resourcesError = null;
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.resourcesLoading = false;
        state.resources = action.payload;
      })
      .addCase(fetchResources.rejected, (state, action) => {
        state.resourcesLoading = false;
        state.resourcesError = action.payload || 'Failed to fetch resources';
      })
      // deleteResource
      .addCase(deleteResource.pending, (state) => {
        state.resourcesLoading = true;
        state.resourcesError = null;
      })
      .addCase(deleteResource.fulfilled, (state) => {
        state.resourcesLoading = false;
      })
      .addCase(deleteResource.rejected, (state, action) => {
        state.resourcesLoading = false;
        state.resourcesError = action.payload || 'Failed to delete resource';
      });
  },
});

export const { clearUsersError, clearResourcesError } = adminSlice.actions;
export default adminSlice.reducer;
