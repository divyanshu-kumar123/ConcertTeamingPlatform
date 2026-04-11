import React from "react";
import "./Loader.css";

const Loader = () => {
  return (
    <div className="loader-container">
      <div className="mic">
        🎤
      </div>

      <div className="wave">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <p className="loading-text">Tuning the music...</p>
    </div>
  );
};

export default Loader;