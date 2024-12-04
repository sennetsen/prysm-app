import React from 'react';
import './Sidebar.css';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="creator-info">
        <div className="avatar-placeholder"></div>
        <h2 className="creator-name">XYZ Creator <span className="verified-icon">✔️</span></h2>
        <p className="bio">Brief bio (like Instagram?) lorem ipsum dolor sit amet</p>
        <p className="request-count">XX Requests</p>
        <div className="followers">
          {/* Display profile icons */}
          <div className="follower-placeholder">+16</div>
        </div>
        <p className="description">
          Description text - Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
