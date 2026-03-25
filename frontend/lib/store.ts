import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/auth/authSlice'
import resourceReducer from './features/resources/resourceSlice'
import bookmarksReducer, { saveToStorage } from './features/bookmarks/bookmarksSlice'
import tagReducer from './features/tags/tagSlice'

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      resources: resourceReducer,
      bookmarks: bookmarksReducer,
      tags: tagReducer,
    },
  })

  let previousBookmarkIds = store.getState().bookmarks.ids;
  store.subscribe(() => {
    const currentIds = store.getState().bookmarks.ids;
    if (currentIds !== previousBookmarkIds) {
      saveToStorage(currentIds);
      previousBookmarkIds = currentIds;
    }
  });

  return store;
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
