import { createSlice } from "@reduxjs/toolkit"

const initialValue = {
    allCategory: [],
    loadingCategory: true,   // ✅ FIXED: start as true so Home.jsx shows skeletons
                              //    while the first fetch is in-flight, not false
    allSubCategory: [],
    product: []
}

const productSlice = createSlice({
    name: 'product',
    initialState: initialValue,
    reducers: {
        setAllCategory: (state, action) => {
            // ✅ FIXED: guard against non-array payloads crashing the spread
            state.allCategory = Array.isArray(action.payload) ? [...action.payload] : []
        },
        setLoadingCategory: (state, action) => {
            state.loadingCategory = action.payload
        },
        setAllSubCategory: (state, action) => {
            // ✅ FIXED: guard against non-array payloads
            state.allSubCategory = Array.isArray(action.payload) ? [...action.payload] : []
        },
    }
})

export const { setAllCategory, setAllSubCategory, setLoadingCategory } = productSlice.actions

export default productSlice.reducer