import React from 'react';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">LOGO</div>
      <h1 className="board-name">Board Name</h1>
      <div className="user-actions">
        <button className="question-icon">?</button>
        <button className="user-icon">👤</button>
        <button className="share-button">Share</button>
      </div>
    </nav>
  );
}

export default Navbar;
