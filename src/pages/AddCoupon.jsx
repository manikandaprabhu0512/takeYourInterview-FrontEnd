import axios from "axios";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Forbidden from "../components/Forbidden";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { ServerUrl } from "../App";

export default function AddCoupon() {
  const { userData } = useSelector((state) => state.user);
  const isAdmin = userData?.role === "ADMIN";

  const [form, setForm] = useState({
    coupon: "",
    quantity: "",
    expiryDate: "",
    credits: "",
  });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log("Form: ", form);

    const response = await axios.post(ServerUrl + "/api/coupon", form, {
      withCredentials: true,
    });
    setForm({
      coupon: "",
      quantity: "",
      expiryDate: "",
      credits: "",
    });

    console.log("Response: ", response);
  };

  if (!isAdmin) {
    return <Forbidden />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-orange-50 dark:from-[#030303] dark:to-slate-900 p-6">
      <div className="mx-auto w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-gray-700 p-10">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              Admin: Add Coupon
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              Create a new coupon code to give users extra credits.
            </p>
          </div>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Coupon Name / ID
              </span>
              <input
                value={form.coupon}
                onChange={handleChange("coupon")}
                placeholder="e.g. SPRING50"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Quantity
              </span>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={handleChange("quantity")}
                placeholder="Number of uses"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Expiry Date
              </span>
              <input
                type="date"
                value={form.expiryDate}
                onChange={handleChange("expiryDate")}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Credits
              </span>
              <input
                type="number"
                min={0}
                value={form.credits}
                onChange={handleChange("credits")}
                placeholder="Credits granted"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                setForm({
                  coupon: "",
                  quantity: "",
                  expiryDate: "",
                  credits: "",
                })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
            >
              Reset
            </button>
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
            >
              Create Coupon
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-orange-600 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-orange-700 hover:text-white dark:bg-slate-900 dark:text-gray-200"
            >
              Go to Home
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
