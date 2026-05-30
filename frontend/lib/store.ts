import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/auth/authSlice'
import resourceReducer from './features/resources/resourceSlice'
import bookmarksReducer from './features/bookmarks/bookmarksSlice'
import tagReducer from './features/tags/tagSlice'
import moderateReducer from './features/moderate/moderateSlice'
import adminReducer from './features/admin/adminSlice'

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      resources: resourceReducer,
      bookmarks: bookmarksReducer,
      tags: tagReducer,
      moderate: moderateReducer,
      admin: adminReducer,
    },
  })

  return store;
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
