import React, { useState, useEffect } from "react";
import "./Navbar.css";
import vector1 from '../../../img/Vector (1).svg';
import vector from '../../../img/Vector.svg';
import icon from '../../../img/Icon.svg';
import fallbackImg from '../../../img/fallback.png';
import { supabase } from "../../../supabaseClient";

function Navbar({ onProfileClick, onQuestionClick, onJoinClick, title, color, onShare, profileRef, onSortChange }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [sortType, setSortType] = useState('new'); // Add state for sort type

  const handleLinkClick = () => {
    window.location.href = '/';
  };

  const handleSortChange = (type) => {
    setSortType(type);
    if (onSortChange) {
      onSortChange(type);
    }
  };

  const navbarStyle = {
    backgroundColor: color || "#b43144",
    boxShadow: isScrolled ? `0 4px 20px ${color || "#b43144"}` : 'none',
  };

  const handleScroll = () => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent && mainContent.scrollTop > 0) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.addEventListener("scroll", handleScroll);
      return () => {
        mainContent.removeEventListener("scroll", handleScroll);
      };
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav style={navbarStyle} className={`navbar ${isScrolled ? "scrolled" : ""}`}>
      <a href="/" onClick={handleLinkClick}>
        <img src={vector1} alt="Logo" className="logo" />
      </a>
      <div className="navbar-title-container">
        <div className="navbar-title">{title || "Request Board"}</div>
      </div>
      <div className="navbar-icons">
        <button className="question-icon" onClick={onQuestionClick}>
          <img src={vector} alt="Help Icon" />
        </button>
        {!user && (
          <button className="join-button" onClick={onJoinClick}>
            <div className="join-button-text">Join</div>
          </button>
        )}
        {user && (
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button className="profile-icon" onClick={onProfileClick} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user?.user_metadata?.picture ? (
                <img
                  src={user.user_metadata.picture}
                  alt="Profile"
                  className="profile-pic"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '2px solid white'
                  }}
                  onError={(e) => {
                    e.target.src = fallbackImg;
                  }}
                />
              ) : (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  backgroundColor: '#ffffff33',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: '500'
                }}>
                  {user?.user_metadata?.name ? user.user_metadata.name[0].toUpperCase() : '?'}
                </div>
              )}
              <span style={{
                color: 'white',
                fontSize: '1rem',
                fontWeight: '500',
              }}>
                {user?.user_metadata?.name}
              </span>
            </button>
          </div>
        )}
        <div className={`sort-toggle ${sortType === 'top' ? 'toggled' : ''}`}>
          <div className="toggle-slider" style={{ backgroundColor: color || "#b43144" }}></div>
          <button
            className="toggle-option"
            onClick={() => handleSortChange('new')}
          >
            New
          </button>
          <button
            className="toggle-option"
            onClick={() => handleSortChange('top')}
          >
            Top
          </button>
        </div>

        <div className="divider"></div>
        <button className="share-button" onClick={onShare}>
          <img src={icon} alt="Share" />
          Share
        </button>
      </div>
    </nav>
  );
}

export default Navbar;