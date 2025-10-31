import { configureStore } from "@reduxjs/toolkit";
import ChatReducer from "./ChatSlice";
import ProjectReducer from "./ProjectSlice";
import nodesReducer from "./NodesSlice";
import FetchProjectsSlice from "./FetchProjectsSlice";
import loadingReducer from "./LoadingSlice";
import UserSlice from "./UserSlice";

const store = configureStore({
  reducer: {
    chat: ChatReducer,
    project: ProjectReducer,
    nodes: nodesReducer,
    fetchprojects : FetchProjectsSlice,
    loading: loadingReducer,
    user: UserSlice,
  },
});

export default store;