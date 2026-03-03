import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/auth/authSlice'
import resourceReducer from './features/resources/resourceSlice'
import tagReducer from './features/tags/tagSlice'

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      resources: resourceReducer,
      tags: tagReducer,
    },
  })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
