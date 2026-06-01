import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { expenseService } from '../../services/api';

export const fetchExpenses = createAsyncThunk('expenses/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const response = await expenseService.getAll(params);
    return response.expenses;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const createExpense = createAsyncThunk('expenses/create', async (data, { rejectWithValue }) => {
  try {
    const response = await expenseService.create(data);
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

export const fetchExpenseSummary = createAsyncThunk('expenses/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    const response = await expenseService.getSummary();
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error);
  }
});

const expenseSlice = createSlice({
  name: 'expenses',
  initialState: {
    items: [],
    summary: { today: 0, month: 0, byCategory: [] },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      });
  },
});

export default expenseSlice.reducer;
