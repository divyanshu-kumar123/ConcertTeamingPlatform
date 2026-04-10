import { createSlice } from '@reduxjs/toolkit';

// Best Practice: Check localStorage on initial load so the user stays logged in after a refresh
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

const initialState = {
  user: user ? user : null,
  token: token ? token : null,
  isAuthenticated: !!token,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      // Persist to local storage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    updateUserTeam: (state, action) => {
      if (state.user) {
        state.user.teamId = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  },
});

export const { setCredentials, logout, updateUserTeam } = authSlice.actions;
export default authSlice.reducer;