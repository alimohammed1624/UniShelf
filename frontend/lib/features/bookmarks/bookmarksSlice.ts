import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BookmarksState {
  ids: number[];
}

export function loadFromStorage(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('bookmarks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToStorage(ids: number[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bookmarks', JSON.stringify(ids));
  }
}

const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState: (): BookmarksState => ({ ids: loadFromStorage() }),
  reducers: {
    toggleBookmark: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      if (state.ids.includes(id)) {
        state.ids = state.ids.filter((x) => x !== id);
      } else {
        state.ids.push(id);
      }
    },
    clearBookmarks: (state) => {
      state.ids = [];
    },
  },
});

export const { toggleBookmark, clearBookmarks } = bookmarksSlice.actions;
export default bookmarksSlice.reducer;
