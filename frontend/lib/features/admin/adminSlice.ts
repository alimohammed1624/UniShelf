import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/apiUtils';
import type { AdminUser, Resource, TempPasswordResult } from '@/types';

export interface UserFilters {
  role?: number | null;
  status?: 'active' | 'banned' | null;
  q?: string | null;
}

interface AdminState {
  users: AdminUser[];
  resources: Resource[];
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

export const fetchUsers = createAsyncThunk<AdminUser[], UserFilters | void, { rejectValue: string }>(
  'admin/fetchUsers',
  async (filters, { rejectWithValue }) => {
    const { role, status, q } = filters || {};
    try {
      const response = await api.get<AdminUser[]>('/admin/users', {
        params: {
          ...(role !== null && role !== undefined ? { role } : {}),
          ...(status ? { status } : {}),
          ...(q ? { q } : {}),
        },
      });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch users'));
    }
  },
);

export const fetchResources = createAsyncThunk<
  Resource[],
  { includeArchived?: boolean },
  { rejectValue: string }
>(
  'admin/fetchResources',
  async ({ includeArchived = false } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get<Resource[]>('/admin/resources', {
        params: { include_archived: includeArchived },
      });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch resources'));
    }
  },
);

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

export const banUser = createAsyncThunk<
  AdminUser,
  { userId: number; reason?: string | null; durationHours?: number | null },
  { rejectValue: string }
>('admin/banUser', async ({ userId, reason, durationHours }, { rejectWithValue }) => {
  try {
    const response = await api.post<AdminUser>(`/admin/users/${userId}/ban`, {
      reason: reason || null,
      duration_hours: durationHours ?? null,
    });
    return response.data;
  } catch (err) {
    const error = err as AxiosError<{ detail: unknown }>;
    return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to ban user'));
  }
});

export const restoreUser = createAsyncThunk<AdminUser, number, { rejectValue: string }>(
  'admin/restoreUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.post<AdminUser>(`/admin/users/${userId}/restore`);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to restore user'));
    }
  },
);

/**
 * Returns the generated password to the caller via `.unwrap()`. It is
 * deliberately never written to the store — it is shown once and discarded.
 */
export const resetUserPassword = createAsyncThunk<TempPasswordResult, number, { rejectValue: string }>(
  'admin/resetUserPassword',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.post<TempPasswordResult>(`/admin/users/${userId}/reset-password`);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to reset password'));
    }
  },
);

export const changeUserRole = createAsyncThunk<
  AdminUser,
  { userId: number; newRole: number },
  { rejectValue: string }
>('admin/changeUserRole', async ({ userId, newRole }, { rejectWithValue }) => {
  try {
    const response = await api.patch<AdminUser>(`/admin/users/${userId}/role`, { new_role: newRole });
    return response.data;
  } catch (err) {
    const error = err as AxiosError<{ detail: unknown }>;
    return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to change role'));
  }
});

export const createUser = createAsyncThunk<
  AdminUser,
  { email: string; full_name: string; password: string; role: number },
  { rejectValue: string }
>('admin/createUser', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<AdminUser>('/admin/users', payload);
    return response.data;
  } catch (err) {
    const error = err as AxiosError<{ detail: unknown }>;
    return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to create user'));
  }
});

/** Replace a user row in place so tables update without a refetch. */
function upsertUser(state: AdminState, user: AdminUser) {
  const index = state.users.findIndex((u) => u.id === user.id);
  if (index !== -1) {
    state.users[index] = user;
  } else {
    state.users.unshift(user);
  }
}

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
      .addCase(deleteResource.fulfilled, (state, action) => {
        state.resourcesLoading = false;
        state.resources = state.resources.filter((r) => r.id !== action.payload);
      })
      .addCase(deleteResource.rejected, (state, action) => {
        state.resourcesLoading = false;
        state.resourcesError = action.payload || 'Failed to delete resource';
      })
      // User mutations — all replace the affected row in place
      .addCase(banUser.fulfilled, (state, action) => {
        upsertUser(state, action.payload);
      })
      .addCase(restoreUser.fulfilled, (state, action) => {
        upsertUser(state, action.payload);
      })
      .addCase(changeUserRole.fulfilled, (state, action) => {
        upsertUser(state, action.payload);
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.unshift(action.payload);
      });
  },
});

export const { clearUsersError, clearResourcesError } = adminSlice.actions;
export default adminSlice.reducer;
