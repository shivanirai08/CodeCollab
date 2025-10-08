import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isChatOpen: false,
};

const ChatSlice = createSlice({
  name: "chat",
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

export const { toggleChatPanel, openChatPanel, closeChatPanel } = ChatSlice.actions;
export default ChatSlice.reducer;


