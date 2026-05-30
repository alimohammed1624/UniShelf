import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api'; // Using your existing axios instance

interface BookmarksState {
  ids: number[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

// Fetch bookmarks from backend
export const fetchBookmarks = createAsyncThunk(
  'bookmarks/fetchBookmarks',
  async () => {
    const response = await api.get('/users/me/bookmarks');
    return response.data as number[];
  }
);

// Toggle bookmark (add/remove)
export const toggleBookmarkAsync = createAsyncThunk(
  'bookmarks/toggleBookmark',
  async (resourceId: number, { getState }) => {
    const state = getState() as any;
    const isBookmarked = state.bookmarks.ids.includes(resourceId);

    if (isBookmarked) {
      await api.delete(`/users/me/bookmarks/${resourceId}`);
    } else {
      await api.post(`/users/me/bookmarks/${resourceId}`);
    }
    return resourceId;
  }
);

const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState: { ids: [], status: 'idle' } as BookmarksState,
  reducers: {
    clearBookmarks: (state) => {
      state.ids = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.ids = action.payload;
      })
      .addCase(toggleBookmarkAsync.fulfilled, (state, action) => {
        const id = action.payload;
        if (state.ids.includes(id)) {
          state.ids = state.ids.filter((x) => x !== id);
        } else {
          state.ids.push(id);
        }
      });
  },
});

export const { clearBookmarks } = bookmarksSlice.actions;
export default bookmarksSlice.reducer;