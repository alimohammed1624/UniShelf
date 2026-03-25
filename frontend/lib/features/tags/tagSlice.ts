import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { Tag, TagBrief } from '@/types';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/apiUtils';

interface TagState {
  items: Tag[];
  loading: boolean;
  error: string | null;
}

const initialState: TagState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchTags = createAsyncThunk<Tag[], void, { rejectValue: string }>(
  'tags/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Tag[]>('/tags');
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch tags'));
    }
  }
);

export const createTag = createAsyncThunk<Tag, { name: string }, { rejectValue: string }>(
  'tags/create',
  async ({ name }, { rejectWithValue }) => {
    try {
      const response = await api.post<Tag>('/tags', { name });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to create tag'));
    }
  }
);

export const assignTagsToResource = createAsyncThunk<
  { resourceId: number; tags: TagBrief[] },
  { resourceId: number; tagIds: number[] },
  { rejectValue: string }
>(
  'tags/assignToResource',
  async ({ resourceId, tagIds }, { rejectWithValue }) => {
    try {
      const response = await api.post<TagBrief[]>(`/resources/${resourceId}/tags`, tagIds);
      return { resourceId, tags: response.data };
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to assign tags'));
    }
  }
);

export const removeTagFromResource = createAsyncThunk<
  { resourceId: number; tagId: number },
  { resourceId: number; tagId: number },
  { rejectValue: string }
>(
  'tags/removeFromResource',
  async ({ resourceId, tagId }, { rejectWithValue }) => {
    try {
      await api.delete(`/resources/${resourceId}/tags/${tagId}`);
      return { resourceId, tagId };
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to remove tag'));
    }
  }
);

const tagSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    clearTagError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTags.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchTags.rejected, (state, action) => { state.loading = false; state.error = action.payload || 'Failed to fetch tags'; })
      .addCase(createTag.fulfilled, (state, action) => { state.items.push(action.payload); })
      .addCase(createTag.rejected, (state, action) => { state.error = action.payload || 'Failed to create tag'; });
  },
});

export const { clearTagError } = tagSlice.actions;
export default tagSlice.reducer;
