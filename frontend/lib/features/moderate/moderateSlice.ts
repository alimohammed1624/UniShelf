import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { Report, ReportCreate } from '@/types';
import api from '@/lib/api';
import { extractErrorMessage } from '@/lib/apiUtils';

interface ModerateState {
  reports: Report[];
  loading: boolean;
  error: string | null;
}

const initialState: ModerateState = {
  reports: [],
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
      });
  },
});

export const { clearReports, clearError } = moderateSlice.actions;
export default moderateSlice.reducer;
