// import { useState, useEffect } from "react";

// const WAKE_UI_DURATION_SECONDS = 90;

// export default function ServerWaking() {
//   const [show, setShow] = useState(false);
//   const [seconds, setSeconds] = useState(WAKE_UI_DURATION_SECONDS);

//   console.log("Server Waking Called");

//   useEffect(() => {
//     const onWaking = (e) => {
//       setShow(true);
//       setSeconds(e.detail?.retryAfter ?? WAKE_UI_DURATION_SECONDS);
//     };
//     const onOnline = () => setShow(false);

//     window.addEventListener("server:waking", onWaking);
//     console.log("OnWaking added");

//     window.addEventListener("server:online", onOnline);
//     console.log("OnOnline added");

//     return () => {
//       window.removeEventListener("server:waking", onWaking);
//       window.removeEventListener("server:online", onOnline);
//     };
//   }, []);

//   useEffect(() => {
//     if (!show) return;
//     if (seconds <= 0) return;

//     const timer = setInterval(() => {
//       setSeconds((s) => Math.max(0, s - 1));
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [show, seconds]);

//   if (!show) return null;

//   return (
//     <div
//       className="fixed inset-0 bg-black/60
//                     flex items-center justify-center z-50"
//     >
//       <div
//         className="bg-white dark:bg-slate-900 rounded-2xl p-8
//                       max-w-sm w-full mx-4 text-center shadow-2xl"
//       >
//         {/* Spinner */}
//         <div
//           className="w-16 h-16 border-4 border-orange-500
//                         border-t-transparent rounded-full
//                         animate-spin mx-auto mb-6"
//         />

//         <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
//           Server Warming Up
//         </h2>

//         <p className="text-gray-500 text-sm mb-4">
//           The server was sleeping to save costs. Waking it up now — almost
//           there!
//         </p>

//         {/* Countdown */}
//         <div className="text-5xl font-bold text-orange-500 mb-4">
//           {seconds}s
//         </div>

//         <p className="text-xs text-gray-400">
//           Page will refresh automatically when the server is ready.
//         </p>
//       </div>
//     </div>
//   );
// }
