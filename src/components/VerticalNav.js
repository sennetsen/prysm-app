import React from 'react';
import './VerticalNav.css';

function VerticalNav({ onPostItClick }) {
  return (
    <div className="vertical-nav">
      <button className="nav-button">
        <i className="icon">✈️</i> {/* Replace with your first icon */}
      </button>
      <button className="nav-button" onClick={onPostItClick}>
        <i className="icon">📝</i> {/* Replace with the post-it icon */}
      </button>
      <button className="nav-button">
        <i className="icon">🔍</i> {/* Replace with your third icon */}
      </button>
      <button className="nav-button">
        <i className="icon">●●●</i> {/* Replace with your fourth icon */}
      </button>
    </div>
  );
}

export default VerticalNav;
