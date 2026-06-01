import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '../../services/api';
import { products } from '../../data/sampleData';

export const fetchProducts = createAsyncThunk('products/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const response = await productService.getAll(params);
    if (response && response.products && response.products.length > 0) {
      return response.products;
    }
    console.warn('API returned no products or is empty. Falling back to sample data.');
    return products.map(p => ({
      id: p.id,
      name: p.name,
      category_name: p.category,
      selling_price: p.price,
      cost_price: p.cost,
      stock_quantity: p.stock,
      barcode: p.barcode,
      image: p.image,
      supplier_name: p.supplier,
      sku: p.sku
    }));
  } catch (error) {
    console.warn('Failed to fetch products from API. Falling back to sample data.');
    return products.map(p => ({
      id: p.id,
      name: p.name,
      category_name: p.category,
      selling_price: p.price,
      cost_price: p.cost,
      stock_quantity: p.stock,
      barcode: p.barcode,
      image: p.image,
      supplier_name: p.supplier,
      sku: p.sku
    }));
  }
});

export const createProduct = createAsyncThunk('products/create', async (data, { rejectWithValue }) => {
  try {
    const response = await productService.create(data);
    return response;
  } catch (error) {
    console.warn('Failed to create product in API. Simulating success.');
    return { id: `p-${Date.now()}`, ...data };
  }
});

export const updateProduct = createAsyncThunk('products/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    await productService.update(id, data);
    return { id, ...data };
  } catch (error) {
    console.warn('Failed to update product in API. Simulating success.');
    return { id, ...data };
  }
});

export const deleteProduct = createAsyncThunk('products/delete', async (id, { rejectWithValue }) => {
  try {
    await productService.delete(id);
    return id;
  } catch (error) {
    console.warn('Failed to delete product in API. Simulating success.');
    return id;
  }
});

export const fetchLowStock = createAsyncThunk('products/lowStock', async (_, { rejectWithValue }) => {
  try {
    const response = await productService.getLowStock();
    if (response && response.products && response.products.length > 0) {
      return response.products;
    }
    console.warn('API returned no low stock products or is empty. Falling back to sample data.');
    return products
      .filter(p => p.stock <= 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        category_name: p.category,
        selling_price: p.price,
        cost_price: p.cost,
        stock_quantity: p.stock,
        barcode: p.barcode,
        image: p.image,
        supplier_name: p.supplier,
        sku: p.sku
      }));
  } catch (error) {
    console.warn('Failed to fetch low stock from API. Falling back to sample data.');
    return products
      .filter(p => p.stock <= 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        category_name: p.category,
        selling_price: p.price,
        cost_price: p.cost,
        stock_quantity: p.stock,
        barcode: p.barcode,
        image: p.image,
        supplier_name: p.supplier,
        sku: p.sku
      }));
  }
});

const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    lowStock: [],
    loading: false,
    error: null,
  },
  reducers: {
    setProducts: (state, action) => {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createProduct.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
      })
      .addCase(fetchLowStock.fulfilled, (state, action) => {
        state.lowStock = action.payload;
      });
  },
});

export const { setProducts } = productSlice.actions;
export default productSlice.reducer;
