import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
    folders: [],
    files: [],
    activeflie: null,
    activefolder: null,
}

export const nodesProject = createAsyncThunk("project/nodesProject", 
    async(projectid, { rejectWithValue }) => { 
        try{
            const res = await fetch(`/api/project/nodes/${projectid}`);
            const data = await res.json();
            return data;
        }catch(error){
            return rejectWithValue(error.message);
        }
    }
)

const NodeSlice = createSlice({
    name: "node",
    initialState,
    reducers: {
        activeFile:(state, action) => {
            state.activeflie = action.payload
        },
        activeFolder:(state, action) => {
            state.activefolder = action.payload
        }
    },
    extraReducers: (builder) => {
        builder
        .addCase(nodesProject.pending, (state) => {
            state.status = "loading";
        })
        .addCase(nodesProject.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.folders = action.payload.folders;
            state.files = action.payload.files;
        })
        .addCase(nodesProject.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.payload;
        })
    }
})

export default NodeSlice.reducer;