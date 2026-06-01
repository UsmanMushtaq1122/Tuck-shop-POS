import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { syncService } from '../../services/api';

export const fetchSyncStatus = createAsyncThunk('sync/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    const response = await syncService.getStatus();
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const processSync = createAsyncThunk('sync/process', async (_, { rejectWithValue }) => {
  try {
    const response = await syncService.process();
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const enqueueSync = createAsyncThunk('sync/enqueue', async (data, { rejectWithValue }) => {
  try {
    const response = await syncService.enqueue(data);
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const retryFailedSync = createAsyncThunk('sync/retryFailed', async (_, { rejectWithValue }) => {
  try {
    await syncService.retryFailed();
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

const syncSlice = createSlice({
  name: 'sync',
  initialState: {
    isOnline: navigator.onLine,
    pending: 0,
    failed: 0,
    synced: 0,
    syncing: false,
    lastSync: null,
  },
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSyncStatus.fulfilled, (state, action) => {
        state.pending = action.payload.pending;
        state.failed = action.payload.failed;
        state.synced = action.payload.synced;
        state.lastSync = new Date().toISOString();
      })
      .addCase(processSync.pending, (state) => {
        state.syncing = true;
      })
      .addCase(processSync.fulfilled, (state) => {
        state.syncing = false;
        state.lastSync = new Date().toISOString();
      })
      .addCase(processSync.rejected, (state) => {
        state.syncing = false;
      });
  },
});

export const { setOnlineStatus } = syncSlice.actions;
export default syncSlice.reducer;
