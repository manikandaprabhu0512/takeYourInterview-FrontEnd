import { createSlice } from "@reduxjs/toolkit";

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const savedTheme = JSON.parse(localStorage.getItem("theme"));

const initialState = {
  darkmode: savedTheme !== null ? savedTheme : getSystemTheme(),
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.darkmode = !state.darkmode;
      localStorage.setItem("theme", JSON.stringify(state.darkmode));
    },
    setTheme: (state, action) => {
      state.darkmode = action.payload;
      localStorage.setItem("theme", JSON.stringify(state.darkmode));
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
