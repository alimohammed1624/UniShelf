import { configureStore, combineReducers } from '@reduxjs/toolkit'
import authReducer, { logout } from './features/auth/authSlice'
import resourceReducer from './features/resources/resourceSlice'
import bookmarksReducer from './features/bookmarks/bookmarksSlice'
import tagReducer from './features/tags/tagSlice'
import moderateReducer from './features/moderate/moderateSlice'
import adminReducer from './features/admin/adminSlice'

const combinedReducer = combineReducers({
  auth: authReducer,
  resources: resourceReducer,
  bookmarks: bookmarksReducer,
  tags: tagReducer,
  moderate: moderateReducer,
  admin: adminReducer,
})

// Logging out drops the whole cached tree, not just auth. Pages fetch lazily
// (`if (resources.length === 0) dispatch(fetchResources())`), so a surviving
// list would be served to whoever logs in next in the same tab — including one
// user's private resources. The action still reaches authReducer, which clears
// the stored token.
const rootReducer: typeof combinedReducer = (state, action) => {
  if (action.type === logout.type) {
    return combinedReducer(undefined, action)
  }
  return combinedReducer(state, action)
}

export const makeStore = () => {
  const store = configureStore({
    reducer: rootReducer,
  })

  return store;
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
