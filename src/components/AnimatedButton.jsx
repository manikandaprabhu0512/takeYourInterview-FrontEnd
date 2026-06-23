import React from "react";
import { useNavigate } from "react-router-dom";

const BorderAnimatedButton = ({ onClick }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-full p-0.5 transition-all duration-300"
    >
      <div className="absolute inset-0 bg-linear-to-r from-violet-600 via-fuchsia-500 to-cyan-500 animate-gradient rounded-full blur-sm opacity-70 group-hover:opacity-100" />

      <div className="relative rounded-full bg-zinc-950 px-8 py-3 text-white">
        Try Marginal →
      </div>
    </button>
  );
};

export default BorderAnimatedButton;
