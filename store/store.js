import { configureStore } from "@reduxjs/toolkit";
import ChatReducer from "./ChatSlice";
import ProjectReducer from "./ProjectSlice";
import nodesReducer from "./NodesSlice";
import FetchProjectsSlice from "./FetchProjectsSlice";

const store = configureStore({
  reducer: {
    chat: ChatReducer,
    project: ProjectReducer,
    nodes: nodesReducer,
    fetchprojects : FetchProjectsSlice,
  },
});

export default store;