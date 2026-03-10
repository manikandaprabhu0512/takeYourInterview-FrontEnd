import React, { useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, scale } from "motion/react";
import axios from "axios";
import { ServerUrl } from "../App";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
function Pricing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [showCouponPopup, setShowCouponPopup] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const dispatch = useDispatch();

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      credits: 100,
      description: "Perfect for beginners starting interview preparation.",
      features: [
        "100 AI Interview Credits",
        "Basic Performance Report",
        "Voice Interview Access",
        "Limited History Tracking",
      ],
      default: true,
    },
    {
      id: "basic",
      name: "Starter Pack",
      price: "₹100",
      credits: 150,
      description: "Great for focused practice and skill improvement.",
      features: [
        "150 AI Interview Credits",
        "Detailed Feedback",
        "Performance Analytics",
        "Full Interview History",
      ],
    },
    {
      id: "pro",
      name: "Pro Pack",
      price: "₹500",
      credits: 650,
      description: "Best value for serious job preparation.",
      features: [
        "650 AI Interview Credits",
        "Advanced AI Feedback",
        "Skill Trend Analysis",
        "Priority AI Processing",
      ],
      badge: "Best Value",
    },
  ];

  useEffect(() => {
    if (!showCouponPopup) return;

    const fetchCoupons = async () => {
      setLoadingCoupons(true);
      try {
        const response = await axios.get(ServerUrl + "/api/coupon", {
          withCredentials: true,
        });
        setAvailableCoupons(response.data || []);
      } catch (error) {
        console.log("Failed to load coupons", error);
        setAvailableCoupons([]);
      } finally {
        setLoadingCoupons(false);
      }
    };

    fetchCoupons();
  }, [showCouponPopup]);

  const handleApplyCoupon = async () => {
    console.log("Coupon Code:", coupon);

    try {
      const response = await axios.post(
        ServerUrl + "/api/coupon/verify",
        { coupon },
        { withCredentials: true },
      );
      setShowCouponPopup(false);
      setCoupon("");
    } catch (error) {
      console.log("Failed to apply coupon", error);
    }
  };

  const handlePayment = async (plan) => {
    try {
      setLoadingPlan(plan.id);

      const amount = plan.id === "basic" ? 100 : plan.id === "pro" ? 500 : 0;

      const result = await axios.post(
        ServerUrl + "/api/payment/order",
        {
          planId: plan.id,
          amount: amount,
          credits: plan.credits,
        },
        { withCredentials: true },
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: result.data.amount,
        currency: "INR",
        name: "takeYourInterview.ai",
        description: `${plan.name} - ${plan.credits} Credits`,
        order_id: result.data.id,

        handler: async function (response) {
          const verifypay = await axios.post(
            ServerUrl + "/api/payment/verify",
            response,
            { withCredentials: true },
          );
          dispatch(setUserData(verifypay.data.user));

          alert("Payment Successful 🎉 Credits Added!");
          navigate("/");
        },
        theme: {
          color: "#10b981",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

      setLoadingPlan(null);
    } catch (error) {
      console.log(error);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-orange-50 dark:from-[#030303] dark:to-slate-900 py-16 px-6">
      <div className="max-w-6xl mx-auto mb-14 flex items-start gap-4">
        <button
          onClick={() => navigate("/")}
          className="mt-2 p-3 rounded-full bg-white dark:bg-slate-900 shadow hover:shadow-md transition"
        >
          <FaArrowLeft className="text-gray-600 dark:text-gray-300" />
        </button>

        <div className="text-center w-full">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            Choose Your Plan
          </h1>
          <p className="text-gray-500 dark:text-gray-300 mt-3 text-lg">
            Flexible pricing to match your interview preparation goals.
          </p>
          <div className="flex flex-nowrap items-center justify-center gap-3 mt-3">
            <p className="text-gray-800 dark:text-white">
              Do you have a Coupon?
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              onClick={() => setShowCouponPopup(true)}
              className="inline-flex items-center justify-center align-middle rounded-full bg-orange-600 px-6 py-1 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
            >
              Apply Coupon
              <FaArrowRight className="ml-2 text-white/90" />
            </motion.button>
          </div>
        </div>
      </div>

      {showCouponPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Apply Coupon
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Enter your coupon code to add credits.
                </p>
              </div>
              <button
                onClick={() => setShowCouponPopup(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Enter coupon code"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
              />

              {loadingCoupons ? (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Loading available coupons...
                </p>
              ) : availableCoupons.length > 0 ? (
                <div className="mt-2 max-h-40 space-y-2 overflow-auto">
                  {availableCoupons.map((coupon) => (
                    <button
                      key={coupon.coupon}
                      type="button"
                      onClick={() => setCoupon(coupon.coupon)}
                      className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 hover:bg-orange-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-100 dark:hover:bg-orange-900/20 cursor-pointer"
                    >
                      <span className="font-medium">{coupon.coupon}</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {coupon.credits}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  No coupons available.
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowCouponPopup(false)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCoupon}
                  className="w-full rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              whileHover={!plan.default && { scale: 1.03 }}
              onClick={() => !plan.default && setSelectedPlan(plan.id)}
              className={`relative rounded-3xl p-8 transition-all duration-300 border 
                ${
                  isSelected
                    ? "border-orange-600 shadow-2xl bg-white dark:bg-slate-900"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 shadow-md"
                }
                ${plan.default ? "cursor-default" : "cursor-pointer"}
              `}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-6 right-6 bg-orange-600 text-white text-xs px-4 py-1 rounded-full shadow">
                  {plan.badge}
                </div>
              )}

              {/* Default Tag */}
              {plan.default && (
                <div className="absolute top-6 right-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs px-3 py-1 rounded-full">
                  Default
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mt-4">
                <span className="text-3xl font-bold text-orange-600">
                  {plan.price}
                </span>
                <p className="text-gray-500 dark:text-gray-300 mt-1">
                  {plan.credits} Credits
                </p>
              </div>

              {/* Description */}
              <p className="text-gray-500 dark:text-gray-300 mt-4 text-sm leading-relaxed">
                {plan.description}
              </p>

              {/* Features */}
              <div className="mt-6 space-y-3 text-left">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <FaCheckCircle className="text-orange-500 text-sm" />
                    <span className="text-gray-700 dark:text-gray-200 text-sm">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {!plan.default && (
                <button
                  disabled={loadingPlan === plan.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSelected) {
                      setSelectedPlan(plan.id);
                    } else {
                      handlePayment(plan);
                    }
                  }}
                  className={`w-full mt-8 py-3 rounded-xl font-semibold transition ${
                    isSelected
                      ? "bg-orange-600 text-white hover:opacity-90"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                  }`}
                >
                  {loadingPlan === plan.id
                    ? "Processing..."
                    : isSelected
                      ? "Proceed to Pay"
                      : "Select Plan"}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default Pricing;
