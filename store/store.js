import { configureStore } from "@reduxjs/toolkit";
import ChatReducer from "./ChatSlice";
import ProjectReducer from "./ProjectSlice";
import NodeSlice from "./NodeSlice";

const store = configureStore({
  reducer: {
    chat: ChatReducer,
    project: ProjectReducer,
    node: NodeSlice,
  },
});

export default store;