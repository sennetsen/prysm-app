import React from "react";
import "./Navbar.css";
import logo from "../img/Vector (1).svg";
import helpIcon from "../img/Vector.svg";
import shareIcon from "../img/Icon.svg";
import { supabase, GoogleSignInButton } from "../supabaseClient";

function Navbar({ onProfileClick, onQuestionClick }) {
  const user = supabase.auth.user;
  const userId = user ? user.id : null;
  const cachedProfilePicture = userId ? localStorage.getItem(`profilePicture_${userId}`) : null;

  return (
    <nav className="navbar">
      <img src={logo} alt="Logo" className="logo" />
      <div className="navbar-title">Board Name</div>
      <div className="navbar-icons">
        <button className="question-icon" onClick={onQuestionClick}>
          <img src={helpIcon} alt="Help Icon" />
        </button>
        <button className="profile-icon" onClick={onProfileClick}>
          {cachedProfilePicture ? (
            <img 
              src={cachedProfilePicture} 
              alt="Profile" 
              className="profile-pic"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '2px solid white'
              }}
            />
          ) : (
            "👤"
          )}
        </button>
        <GoogleSignInButton />
        <div className="divider"></div>
        <button className="share-button">
          <div className="share-button-icon">
            <img src={shareIcon} alt="Share Icon" />
          </div>
          <div className="share-button-text">
            Share
          </div>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;