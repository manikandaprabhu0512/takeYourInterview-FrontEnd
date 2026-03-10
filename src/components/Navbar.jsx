import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "motion/react";
import { BsRobot, BsCoin } from "react-icons/bs";
import { HiOutlineLogout } from "react-icons/hi";
import { FaUserAstronaut } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ServerUrl } from "../App";
import { setUserData } from "../redux/userSlice";
import { toggleTheme } from "../redux/themeChange";
import AuthModel from "./AuthModel";
function Navbar() {
  const { userData } = useSelector((state) => state.user);
  const isAdmin = userData?.role === "ADMIN";
  const darkMode = useSelector((state) => state.theme.darkmode);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showAuth, setShowAuth] = useState(false);

  const creditButtonRef = useRef(null);
  const creditPopupRef = useRef(null);
  const userButtonRef = useRef(null);
  const userPopupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      if (
        showCreditPopup &&
        creditPopupRef.current &&
        !creditPopupRef.current.contains(target) &&
        creditButtonRef.current &&
        !creditButtonRef.current.contains(target)
      ) {
        setShowCreditPopup(false);
      }

      if (
        showUserPopup &&
        userPopupRef.current &&
        !userPopupRef.current.contains(target) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(target)
      ) {
        setShowUserPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCreditPopup, showUserPopup]);

  const handleLogout = async () => {
    try {
      await axios.get(ServerUrl + "/api/auth/logout", {
        withCredentials: true,
      });
      dispatch(setUserData(null));
      setShowCreditPopup(false);
      setShowUserPopup(false);
      navigate("/");
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="dark:bg-[#030303] bg-[#f3f3f3] flex justify-center px-4 pt-6">
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-6xl dark:bg-[#030303] bg-white rounded-3xl shadow-sm border border-orange-600 px-8 py-4 flex justify-between items-center relative"
      >
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="bg-orange-600 text-white p-2 rounded-lg">
            <BsRobot size={18} />
          </div>
          <h1 className="font-semibold hidden md:block text-lg text-black dark:text-white">
            takeYourInterview.ai
          </h1>
        </div>

        <div className="flex items-center gap-6 relative">
          <div className="relative">
            <button
              ref={creditButtonRef}
              onClick={() => {
                if (!userData) {
                  setShowAuth(true);
                  return;
                }
                setShowCreditPopup(!showCreditPopup);
                setShowUserPopup(false);
              }}
              className="flex items-center gap-2 bg-gray-100 dark:bg-slate-900 dark:text-white px-4 py-2 rounded-full text-md hover:bg-gray-200 dark:hover:bg-slate-800 transition"
            >
              <BsCoin size={20} />
              {userData?.credits || 0}
            </button>

            {showCreditPopup && (
              <div
                ref={creditPopupRef}
                className="absolute -right-12.5 mt-3 w-64 bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-gray-700 rounded-xl p-5 z-50"
              >
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Need more credits to continue interviews?
                </p>
                <button
                  onClick={() => navigate("/pricing")}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-sm cursor-pointer"
                >
                  Buy more credits
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              ref={userButtonRef}
              onClick={() => {
                if (!userData) {
                  setShowAuth(true);
                  return;
                }
                setShowUserPopup(!showUserPopup);
                setShowCreditPopup(false);
              }}
              className="w-9 h-9 bg-orange-600 text-white rounded-full flex items-center justify-center font-semibold"
            >
              {userData ? (
                userData?.name.slice(0, 2).toUpperCase()
              ) : (
                <FaUserAstronaut size={16} />
              )}
            </button>

            {showUserPopup && (
              <div
                ref={userPopupRef}
                className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-gray-700 rounded-xl p-4 z-50"
              >
                <p className="text-md text-orange-500 dark:text-orange-400 font-medium mb-1">
                  {userData?.name}
                </p>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {darkMode ? "Dark Mode" : "Light Mode"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={darkMode}
                      onChange={() => dispatch(toggleTheme())}
                    />
                    <div className="w-10 h-5 bg-gray-300 dark:bg-slate-700 rounded-full transition-colors peer-checked:bg-orange-500" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => navigate("/add-coupon")}
                    className="w-full text-left text-sm py-2 hover:text-black dark:hover:text-white text-gray-600 dark:text-gray-300"
                  >
                    Add Coupon
                  </button>
                )}
                <button
                  onClick={() => navigate("/history")}
                  className="w-full text-left text-sm py-2 hover:text-black dark:hover:text-white text-gray-600 dark:text-gray-300"
                >
                  InterView History
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-sm py-2 flex items-center gap-2 text-red-500 dark:text-red-400"
                >
                  <HiOutlineLogout size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default Navbar;
