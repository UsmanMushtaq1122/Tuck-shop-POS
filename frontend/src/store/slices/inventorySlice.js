import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryService } from '../../services/api';

export const fetchInventoryProducts = createAsyncThunk('inventory/fetchProducts', async (params, { rejectWithValue }) => {
  try {
    const response = await inventoryService.getProducts(params);
    return response.products;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const adjustInventory = createAsyncThunk('inventory/adjust', async (data, { rejectWithValue }) => {
  try {
    const response = await inventoryService.adjust(data);
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const fetchInventoryLogs = createAsyncThunk('inventory/fetchLogs', async (params, { rejectWithValue }) => {
  try {
    const response = await inventoryService.getLogs(params);
    return response.logs;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const fetchInventoryAlerts = createAsyncThunk('inventory/fetchAlerts', async (_, { rejectWithValue }) => {
  try {
    const response = await inventoryService.getAlerts();
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    products: [],
    logs: [],
    alerts: { lowStock: [], outOfStock: [] },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventoryProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInventoryProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchInventoryProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchInventoryAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload;
      });
  },
});

export default inventorySlice.reducer;
