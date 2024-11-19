import { createSlice } from '@reduxjs/toolkit';

const initialState = { message : null}

const messageSlice = createSlice({
  name : 'message',
  initialState,
  reducer : {
    setMessage : (state, action) => {
      const userMessage = action.payload;
      state.message = userMessage;
    },
    clearMessage : (state) => {
      state.message = initialState.message;
    }
  }
})

export const { setMessage, clearMessage } = messageSlice.actions;

export default messageSlice.reducer;
