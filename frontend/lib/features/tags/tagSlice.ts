import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Tag, TagBrief } from '@/types';

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

function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
    return detail[0].msg;
  }
  return fallback;
}

export const fetchTags = createAsyncThunk<Tag[], void, { rejectValue: string }>(
  'tags/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/tags`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(extractErrorMessage(errorData.detail, 'Failed to fetch tags'));
      }
      return await response.json();
    } catch {
      return rejectWithValue('Network error');
    }
  }
);

export const createTag = createAsyncThunk<Tag, { name: string }, { rejectValue: string }>(
  'tags/create',
  async ({ name }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(extractErrorMessage(errorData.detail, 'Failed to create tag'));
      }
      return await response.json();
    } catch {
      return rejectWithValue('Network error');
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources/${resourceId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagIds),
      });
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(extractErrorMessage(errorData.detail, 'Failed to assign tags'));
      }
      const tags: TagBrief[] = await response.json();
      return { resourceId, tags };
    } catch {
      return rejectWithValue('Network error');
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/resources/${resourceId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(extractErrorMessage(errorData.detail, 'Failed to remove tag'));
      }
      return { resourceId, tagId };
    } catch {
      return rejectWithValue('Network error');
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
