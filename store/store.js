import { configureStore } from "@reduxjs/toolkit";
import ChatReducer from "./ChatSlice";
import ProjectReducer from "./ProjectSlice";
import NodeSlice from "./NodeSlice";
import FetchProjectsSlice from "./FetchProjectsSlice";

const store = configureStore({
  reducer: {
    chat: ChatReducer,
    project: ProjectReducer,
    node: NodeSlice,
    fetchprojects : FetchProjectsSlice,
  },
});

export default store;