import React from "react";
import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-orange-50 dark:from-[#030303] dark:to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
        <div className="mb-6">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white">
            403
          </h1>
          <p className="mt-2 text-lg font-medium text-gray-600 dark:text-gray-300">
            Forbidden - You don’t have access to this page.
          </p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          You need an admin account to view this section. If you believe this is
          an error, contact your administrator.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
