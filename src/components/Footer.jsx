import React from "react";
import { BsRobot } from "react-icons/bs";

function Footer() {
  return (
    <div className="dark:bg-[#030303] bg-[#f3f3f3] flex justify-center px-4 pb-10 py-4 pt-10">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-orange-600 py-8 px-3 text-center">
        <div className="flex justify-center items-center gap-3 mb-3">
          <div className="bg-orange-600 text-white p-2 rounded-lg">
            <BsRobot size={16} />
          </div>
          <h2 className="font-semibold text-black dark:text-white">
            takeYourInterview.ai
          </h2>
        </div>
        <p className="text-gray-500 dark:text-gray-300 text-sm max-w-xl mx-auto">
          AI-powered interview preparation platform designed to improve
          communication skills, technical depth and professional confidence.
        </p>
      </div>
    </div>
  );
}

export default Footer;
