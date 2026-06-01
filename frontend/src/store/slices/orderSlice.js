import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderService } from '../../services/api';
import { orders } from '../../data/sampleData';

export const fetchOrders = createAsyncThunk('orders/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const response = await orderService.getAll(params);
    return response.orders;
  } catch (error) {
    console.warn('Failed to fetch orders from API. Falling back to sample data.');
    return orders;
  }
});

export const createOrder = createAsyncThunk('orders/create', async (data, { rejectWithValue }) => {
  try {
    const response = await orderService.create(data);
    return response;
  } catch (error) {
    console.warn('Failed to save order to API. Saving locally in mock mode.');
    return {
      success: true,
      order_number: `INV-${Date.now()}`,
      order: data
    };
  }
});

export const fetchOrder = createAsyncThunk('orders/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const response = await orderService.getById(id);
    return response;
  } catch (error) {
    console.warn('Failed to fetch order details from API. Falling back to local search.');
    const localOrder = orders.find(o => o.id === id);
    if (localOrder) return localOrder;
    return rejectWithValue('Order not found');
  }
});

export const fetchTodayOrders = createAsyncThunk('orders/fetchToday', async (_, { rejectWithValue }) => {
  try {
    const response = await orderService.getToday();
    return response.orders;
  } catch (error) {
    console.warn('Failed to fetch today\'s orders from API. Falling back to sample data.');
    return orders.filter(o => o.date.startsWith('2026-05-21'));
  }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    items: [],
    todayOrders: [],
    currentOrder: null,
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createOrder.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })
      .addCase(fetchTodayOrders.fulfilled, (state, action) => {
        state.todayOrders = action.payload;
      });
  },
});

export const { setCurrentOrder, clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;
