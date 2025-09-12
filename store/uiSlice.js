import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isChatOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleChatPanel: (state) => {
      state.isChatOpen = !state.isChatOpen;
    },
    openChatPanel: (state) => {
      state.isChatOpen = true;
    },
    closeChatPanel: (state) => {
      state.isChatOpen = false;
    },
  },
});

export const { toggleChatPanel, openChatPanel, closeChatPanel } = uiSlice.actions;
export default uiSlice.reducer;


