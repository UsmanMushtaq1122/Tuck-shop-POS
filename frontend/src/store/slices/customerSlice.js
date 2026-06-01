import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { customerService } from "../../services/api";
import { customers } from "../../data/sampleData";

export const fetchCustomers = createAsyncThunk(
  "customers/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await customerService.getAll(params);
      if (response && response.customers && response.customers.length > 0) {
        return response.customers;
      }
      console.warn(
        "API returned no customers or is empty. Falling back to sample data."
      );
      return customers;
    } catch (error) {
      console.warn(
        "Failed to fetch customers from API. Falling back to sample data."
      );
      return customers;
    }
  }
);

export const createCustomer = createAsyncThunk(
  "customers/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await customerService.create(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error);
    }
  }
);

const customerSlice = createSlice({
  name: "customers",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default customerSlice.reducer;
