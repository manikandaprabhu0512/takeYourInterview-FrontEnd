import { useFormik } from "formik";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { z } from "zod";
import { setUserData } from "../redux/userSlice";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import axios from "axios";

const loginSchema = z.object({
  email: z.email("Please enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const validate = (values) => {
  const result = loginSchema.safeParse(values);
  if (result.success) return {};

  const errors = {};
  result.error.issues.forEach((issue) => {
    const field = issue.path[0];
    errors[field] = issue.message;
  });

  return errors;
};

export default function Login({ onClose }) {
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validate,
    onSubmit: async (values, helpers) => {
      const response = await axios.post("/api/auth/login", values, {
        withCredentials: true,
      });
      console.log(response);

      dispatch(setUserData(response.data));
      helpers.resetForm();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Login
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Enter your account credentials.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <form className="space-y-4" onSubmit={formik.handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Email
          </span>
          <input
            id="email"
            name="email"
            required
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            type="email"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
          />
          {formik.touched.email && formik.errors.email && (
            <span className="text-sm text-red-600">{formik.errors.email}</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Password
          </span>
          <div className="relative">
            <input
              id="password"
              name="password"
              required
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              type={showPassword ? "text" : "password"}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 pr-10 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
            />

            {formik.values.password.length > 0 &&
              (showPassword ? (
                <EyeIcon
                  className="w-5 h-5 text-gray-500 cursor-pointer absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                />
              ) : (
                <EyeSlashIcon
                  className="w-5 h-5 text-gray-500 cursor-pointer absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                />
              ))}
          </div>
          {formik.touched.password && formik.errors.password && (
            <span className="text-sm text-red-600">
              {formik.errors.password}
            </span>
          )}
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
}
