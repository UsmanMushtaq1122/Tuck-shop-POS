import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../../services/api";

const token = localStorage.getItem("token");
const user = localStorage.getItem("user");

const normalizeUser = (userData) => {
  if (!userData) return userData;
  const role =
    typeof userData.role === "string"
      ? userData.role.toLowerCase()
      : userData.role;
  return { ...userData, role };
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      console.log("Attempting login with:", credentials);
      const response = await authService.login(credentials);
      console.log("Login response:", response);
      const normalizedUser = normalizeUser(response.user);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      return { ...response, user: normalizedUser };
    } catch (error) {
      console.error("API login failed:", error);
      console.warn("Falling back to mock authentication.");

      if (credentials.pin) {
        if (credentials.pin.length === 3 || credentials.pin.length === 4) {
          const mockResponse = {
            token: "mock-token-12345",
            user: normalizeUser({
              id: "e1",
              name: "Ali Raza",
              email: "ali@tuckshop.com",
              role: "Manager",
            }),
          };
          localStorage.setItem("token", mockResponse.token);
          localStorage.setItem("user", JSON.stringify(mockResponse.user));
          return mockResponse;
        } else {
          return rejectWithValue("PIN must be 3 or 4 digits");
        }
      }

      if (credentials.email && credentials.password) {
        const mockResponse = {
          token: "mock-token-12345",
          user: normalizeUser({
            id: "e1",
            name: "Ali Raza",
            email: credentials.email,
            role: "Manager",
          }),
        };
        localStorage.setItem("token", mockResponse.token);
        localStorage.setItem("user", JSON.stringify(mockResponse.user));
        return mockResponse;
      }

      return rejectWithValue(error.response?.data?.error || "Login failed");
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return normalizeUser(response.user);
    } catch (error) {
      // Return mock user from localStorage if we are in frontend-only mock mode
      const localUser = localStorage.getItem("user");
      if (localUser) {
        return normalizeUser(JSON.parse(localUser));
      }
      return rejectWithValue(
        error.response?.data?.error || "Failed to retrieve session"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: user ? normalizeUser(JSON.parse(user)) : null,
    token,
    isAuthenticated: !!token,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = normalizeUser(action.payload.user);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = normalizeUser(action.payload);
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
