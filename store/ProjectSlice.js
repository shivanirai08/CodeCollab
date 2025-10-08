import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  projectid: "",
  projectname: "",
  description: "",
  visibility: "",
  template: "",
  language: "",
  join_code: "",
  owner: "",
  collaborators: [],
  viewers: [],
};

// Async Thunk
export const fetchProject = createAsyncThunk("project/fetchProject", 
    async (projectid, { rejectWithValue }) => {
        try{
            const res = await fetch(`/api/project/${projectid}`);
            const data = await res.json();
            return data;
        }catch(error){
            return rejectWithValue(error.message);
        }
    }
);

export const memberProject = createAsyncThunk("project/memberProject",
    async(projectid, { rejectWithValue }) => {
        try{
            const res = await fetch(`/api/project/role/${projectid}`);
            const data = await res.json();
            return data;
        }catch(error){
            return rejectWithValue(error.message);
        }
    }
)

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
    //Fetching project details
      .addCase(fetchProject.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        const project = action.payload.project;
        if(project){
            state.projectid = project.projectid;
            state.projectname = project.projectname;
            state.description = project.description;
            state.visibility = project.visibility;
            state.template = project.template;
            state.language = project.language;
            state.join_code = project.join_code;
        }
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

    //   Fetching project memebers
      .addCase(memberProject.pending,(state) => {
        state.status = "loading";
      })
      .addCase(memberProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.owner = action.payload.owner;
        state.collaborators = action.payload.collaborators;
        state.viewers = action.payload.viewers;
      })
      .addCase(memberProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
  },
});

export default projectSlice.reducer;
