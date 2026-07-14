import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "./redux/userSlice";
import InterviewPage from "./pages/InterviewPage";
import InterviewHistory from "./pages/InterviewHistory";
import Pricing from "./pages/Pricing";
import AddCoupon from "./pages/AddCoupon";
import InterviewReport from "./pages/InterviewReport";

// export const ServerUrl =
//   import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

function App() {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.theme.darkmode);
  const [isServerStarting, setIsServerStarting] = useState(true);
  const [startupSecondsLeft, setStartupSecondsLeft] = useState(60);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    if (!isServerStarting) return;

    const timer = window.setInterval(() => {
      setStartupSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isServerStarting]);

  useEffect(() => {
    if (!isServerStarting) return;

    const healthCheck = async () => {
      try {
        const [healthResponse] = await Promise.all([axios.get("/api/health")]);

        if (healthResponse.status === 200) {
          setIsServerStarting(false);
        }
      } catch (error) {
        console.log("Health check failed:", error);
      }
    };

    healthCheck();

    const intervalId = window.setInterval(healthCheck, 1000);

    return () => window.clearInterval(intervalId);
  }, [isServerStarting]);

  useEffect(() => {
    if (isServerStarting) return;
    const getUser = async () => {
      try {
        const result = await axios.get("/api/user/current-user", {
          withCredentials: true,
        });
        dispatch(setUserData(result.data));
        console.log("User: ", result.data);
      } catch (error) {
        console.log(error);
        dispatch(setUserData(null));
      }
    };
    getUser();
  }, [dispatch, isServerStarting]);

  if (isServerStarting) {
    const progress = ((60 - startupSecondsLeft) / 60) * 100;

    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-orange-100 dark:from-[#030303] dark:via-slate-900 dark:to-slate-800 flex items-center justify-center px-4 text-gray-900 dark:text-gray-100">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-8 border-orange-100 dark:border-slate-800">
            <span className="text-3xl font-bold text-orange-600">
              {startupSecondsLeft}
            </span>
          </div>

          <h1 className="text-2xl font-bold mb-3">Starting server</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            Render may need a short cold start. Your interview will load
            automatically once the backend is ready.
          </p>

          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-orange-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            {startupSecondsLeft > 0
              ? "Please keep this tab open."
              : "Still waking up. This can take a little longer sometimes."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/interview" element={<InterviewPage />} />
      <Route path="/history" element={<InterviewHistory />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/add-coupon" element={<AddCoupon />} />
      <Route path="/report/:id" element={<InterviewReport />} />
    </Routes>
  );
}

export default App;
