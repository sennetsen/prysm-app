import React from "react";
import "./Navbar.css";
import { supabase, GoogleSignInButton } from "../supabaseClient";

function Navbar({ onProfileClick, onQuestionClick }) {
  return (
    <nav className="navbar">
      <img src="/img/Group 21.svg" alt="Logo" className="logo" />
      <div className="navbar-icons">
        <button className="question-icon" onClick={onQuestionClick}>
          ︖
        </button>
        <button className="profile-icon" onClick={onProfileClick}>
          👤
        </button>
        <div className="divider"></div>
        <button className="share-button">Share</button>
        <GoogleSignInButton />
      </div>
    </nav>
  );
}

export default Navbar;