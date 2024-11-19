import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      const userData = action.payload;
      // createdAt 필드를 직렬화 가능한 형태로 변환
      if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
        userData.createdAt = userData.createdAt.toDate().toISOString();
      }
      if (userData.profile && userData.profile.createdAt && typeof userData.profile.createdAt.toDate === 'function') {
        userData.profile.createdAt = userData.profile.createdAt.toDate().toISOString();
      }
      state.user = userData;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
});




export const { setUser, clearUser } = userSlice.actions;

export default userSlice.reducer;
