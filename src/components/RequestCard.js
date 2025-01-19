import React, { useState, useEffect } from "react";
import "./RequestCard.css";

function RequestCard({ id, title, content, isAnonymous, color, onDelete }) {
  const [liked, setLiked] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  const toggleLike = () => {
    setLiked(!liked);
  };

  useEffect(() => {
    const createdTime = new Date();
    const updateTimestamp = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now - createdTime) / 1000);

      if (diffInSeconds < 60) {
        setTimestamp('just now');
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        setTimestamp(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimestamp(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setTimestamp(`${days} day${days > 1 ? 's' : ''} ago`);
      }
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="request-card" style={{ backgroundColor: color }}>
      <button className="delete-button" onClick={() => onDelete(id)}>
        ✖
      </button>
      <h3>{title}</h3>
      <p>{content}</p>
      {isAnonymous ? (
        <p className="anonymous">Posted anonymously</p>
      ) : (
        <div className="user-info">
          <img src="/path-to-profile-pic.jpg" alt="Profile" className="profile-pic" />
          <span className="username">Username</span>
        </div>
      )}
      <div className="card-footer">
        <span className="timestamp">{timestamp}</span>
        <button className={`like-button ${liked ? 'liked' : ''}`} onClick={toggleLike}>
          {liked ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  );
}

export default RequestCard;
