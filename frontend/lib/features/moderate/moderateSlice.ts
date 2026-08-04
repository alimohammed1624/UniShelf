import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { Report, ReportCreate, Resource } from '@/types';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/apiUtils';
import { restoreResource } from '@/lib/features/resources/resourceSlice';

interface ModerateState {
  reports: Report[];
  archivedResources: Resource[];
  loading: boolean;
  error: string | null;
}

const initialState: ModerateState = {
  reports: [],
  archivedResources: [],
  loading: false,
  error: null,
};

export const fetchReports = createAsyncThunk<Report[], { statusFilter?: number }, { rejectValue: string }>(
  'moderate/fetchReports',
  async ({ statusFilter }: { statusFilter?: number } = {}, { rejectWithValue }) => {
    try {
      const params: Record<string, string | number> = {};
      if (statusFilter !== undefined) {
        params.status = statusFilter;
      }
      const response = await api.get<Report[]>('/moderate/reports', { params });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch reports'));
    }
  }
);

/**
 * Resources currently held down by a moderation takedown. Resource-backed on
 * purpose: reports alone can't tell an archived resource from a dismissed
 * false alarm, and takedowns that never came from a report have no report row.
 */
export const fetchArchivedResources = createAsyncThunk<Resource[], { skip?: number; limit?: number }, { rejectValue: string }>(
  'moderate/fetchArchivedResources',
  async ({ skip, limit }: { skip?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const params: Record<string, string | number> = {};
      if (skip !== undefined) {
        params.skip = skip;
      }
      if (limit !== undefined) {
        params.limit = limit;
      }
      const response = await api.get<Resource[]>('/moderate/resources/archived', { params });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to fetch archived resources'));
    }
  }
);

export const resolveReport = createAsyncThunk<Report, number, { rejectValue: string }>(
  'moderate/resolveReport',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await api.put<Report>(`/moderate/reports/${reportId}`);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to resolve report'));
    }
  }
);

export const dismissReport = createAsyncThunk<Report, number, { rejectValue: string }>(
  'moderate/dismissReport',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await api.delete<Report>(`/moderate/reports/${reportId}`);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to dismiss report'));
    }
  }
);

export const submitReport = createAsyncThunk<Report, ReportCreate, { rejectValue: string }>(
  'moderate/submitReport',
  async (reportData, { rejectWithValue }) => {
    try {
      const response = await api.post<Report>(`/resources/${reportData.resource_id}/report`, { reason: reportData.reason });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ detail: unknown }>;
      return rejectWithValue(extractErrorMessage(error.response?.data?.detail, 'Failed to submit report'));
    }
  }
);

const moderateSlice = createSlice({
  name: 'moderate',
  initialState,
  reducers: {
    clearReports: (state) => {
      state.reports = [];
    },
    clearArchivedResources: (state) => {
      state.archivedResources = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch reports
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch reports';
      })
      // Fetch archived resources
      .addCase(fetchArchivedResources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchArchivedResources.fulfilled, (state, action) => {
        state.loading = false;
        state.archivedResources = action.payload;
      })
      .addCase(fetchArchivedResources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch archived resources';
      })
      // Resolve report
      .addCase(resolveReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resolveReport.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.reports.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.reports[idx] = action.payload;
        }
      })
      .addCase(resolveReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to resolve report';
      })
      // Dismiss report
      .addCase(dismissReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(dismissReport.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.reports.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.reports[idx] = action.payload;
        }
      })
      .addCase(dismissReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to dismiss report';
      })
      // Submit report
      .addCase(submitReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reports.unshift(action.payload);
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to submit report';
      })
      // Restore (owned by the resources slice) — a lifted archive leaves this list
      .addCase(restoreResource.fulfilled, (state, action) => {
        state.archivedResources = state.archivedResources.filter((r) => r.id !== action.payload.id);
      });
  },
});

export const { clearReports, clearArchivedResources, clearError } = moderateSlice.actions;
export default moderateSlice.reducer;
