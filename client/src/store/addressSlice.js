import { createSlice } from "@reduxjs/toolkit";

const initialValue = {
    addressList : []
}

const addressSlice = createSlice({
    name : 'address',
    initialState : initialValue,
    reducers : {
        handleAddAddress : (state,action)=>{
            state.addressList = Array.isArray(action.payload) ? [...action.payload] : []
        }
    }
})

export const {handleAddAddress  } = addressSlice.actions

export default addressSlice.reducer