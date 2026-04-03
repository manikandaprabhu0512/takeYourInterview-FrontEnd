// import axios from "axios";

// const WAKE_SERVER_URL = import.meta.env.VITE_WAKE_SERVER_URL;
// const WAKE_UI_DURATION_SECONDS = 90;

// console.log("API File loaded");

// export const api = axios.create({
//   baseURL: "/api",
//   timeout: 5000,
// });

// let isWaking = false;
// let pollingInterval = null;

// function reconnectToBackend() {
//   const nextUrl = new URL(window.location.href);
//   nextUrl.searchParams.set("_wake", Date.now().toString());
//   window.location.replace(nextUrl.toString());
// }

// // Intercept failed requests
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     console.log("Error", error?.response?.status);

//     const isNetworkError = !error.response;
//     const isServerDown = error.response?.status >= 500;

//     if ((isNetworkError || isServerDown) && !isWaking) {
//       isWaking = true;

//       // Tell wake server to start EC2
//       await axios
//         .post(`${WAKE_SERVER_URL}/wake`, {
//           path: window.location.pathname,
//         })
//         .catch(() => {});

//       // Dispatch event for UI to show warming screen
//       window.dispatchEvent(
//         new CustomEvent("server:waking", {
//           detail: { retryAfter: WAKE_UI_DURATION_SECONDS },
//         }),
//       );

//       // Start polling
//       startPolling();
//     }

//     return Promise.reject(error);
//   },
// );

// function startPolling() {
//   // Clear any existing interval
//   if (pollingInterval) clearInterval(pollingInterval);

//   pollingInterval = setInterval(async () => {
//     try {
//       const { data } = await axios.get(`${WAKE_SERVER_URL}/check`);

//       if (data.online) {
//         clearInterval(pollingInterval);
//         pollingInterval = null;
//         isWaking = false;

//         // Dispatch event for UI
//         window.dispatchEvent(new CustomEvent("server:online"));

//         // Force a fresh navigation so the app reconnects to the backend.
//         setTimeout(reconnectToBackend, 1000);
//         console.log("Forced Timeout...");
//       }
//     } catch {
//       // Still offline — keep polling
//     }
//   }, 10000); // Poll every 10 seconds
// }
