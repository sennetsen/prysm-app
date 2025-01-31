import React, { useState, useEffect } from "react";
import "./Navbar.css";
import logo from "../img/Vector (1).svg";
import helpIcon from "../img/Vector.svg";
import shareIcon from "../img/Icon.svg";
import { supabase, GoogleSignInButton } from "../supabaseClient";
import { Link } from "react-router-dom";

function Navbar({ onProfileClick, onQuestionClick, onJoinClick, title, color, onShare }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [cachedProfilePicture, setCachedProfilePicture] = useState(null);

  const navbarStyle = {
    backgroundColor: color || "#b43144", // Fallback color
  };

  const handleScroll = () => {
    if (window.scrollY > 0) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const userId = session.user.id;
        const cachedPic = localStorage.getItem(`profilePicture_${userId}`);
        setCachedProfilePicture(cachedPic);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav style={navbarStyle} className={`navbar ${isScrolled ? "scrolled" : ""}`}>
      <Link to="/">
        <img src={logo} alt="Logo" className="logo" />
      </Link>
      <div className="navbar-title">{title || "Request Board"}</div>
      <div className="navbar-icons">
        <button className="question-icon" onClick={onQuestionClick}>
          <img src={helpIcon} alt="Help Icon" />
        </button>
        {!user && (
          <button className="join-button" onClick={onJoinClick}>
            <div className="join-button-text">Join</div>
          </button>
        )}
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
        <button className="google-profile-button" onClick={onProfileClick}>
          <GoogleSignInButton />
        </button>
        <div className="divider"></div>
        <button className="share-button" onClick={onShare}>
          <img src={shareIcon} alt="Share" />
          Share
        </button>
      </div>
    </nav>
  );
}

export default Navbar;