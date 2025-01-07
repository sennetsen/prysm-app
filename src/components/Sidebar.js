// import React from 'react';
// import './Sidebar.css';

// function Sidebar() {
//   return (
//     <aside className="sidebar">
//       <div className="creator-info">
//         <div className="avatar-placeholder"></div>
//         <h2 className="creator-name">XYZ Creator <span className="verified-icon">✔️</span></h2>
//         <p className="bio">Brief bio (like Instagram?) lorem ipsum dolor sit amet</p>
//         <p className="request-count">XX Requests</p>
//         <div className="followers">
//           {/* Display profile icons */}
//           <div className="follower-placeholder">+16</div>
//         </div>
//         <p className="description">
//           Description text - Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
//         </p>
//       </div>
//     </aside>
//   );
// }

// export default Sidebar;


import React, { useState } from "react";
import "./Sidebar.css";

function Sidebar() {
  const [isHidden, setIsHidden] = useState(false); // Tracks sidebar visibility

  const toggleSidebar = () => {
    setIsHidden(!isHidden);
  };

  return (
    <div className={`sidebar ${isHidden ? "hidden" : ""}`}>
      {!isHidden && (
        <div className="sidebar-content">
          {/* Profile Picture */}
          <div className="profile-picture"></div>

          {/* Creator Info */}
          <h2 className="creator-name">XYZ Creator</h2>
          <p className="creator-bio">Brief bio (like Instagram?) lorem ipsum dolor sit amet</p>

          {/* Requests Section */}
          <p className="requests-title">XX Requests</p>
          <div className="requests-avatars">
            <img src="https://via.placeholder.com/30" alt="Avatar" className="avatar" />
            <img src="https://via.placeholder.com/30" alt="Avatar" className="avatar" />
            <img src="https://via.placeholder.com/30" alt="Avatar" className="avatar" />
            <img src="https://via.placeholder.com/30" alt="Avatar" className="avatar" />
            <span className="more-requests">+16</span>
          </div>

          {/* Description */}
          <p className="description-text">
            Description text - Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
            quis nostrud exercitation.
          </p>
          {/* <p className="description-text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna.
          </p> */}
        </div>
      )}

      {/* Toggle Button */}
      <button className="toggle-button" onClick={toggleSidebar}>
        {isHidden ? ">" : "<"}
      </button>
    </div>
  );
}

export default Sidebar;
