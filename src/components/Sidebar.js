import React, { useState } from "react";
import "./Sidebar.css";
import fallbackImg from '../img/fallback.png'; // Import the fallback image
import verifiedIcon from '../img/verified.svg';

function Sidebar({ description, bio, totalPosts, creatorName, avatarUrl, posts }) {
  const [isHidden, setIsHidden] = useState(false); // Tracks sidebar visibility

  const toggleSidebar = () => {
    setIsHidden(!isHidden);
  };

  // Get the first 4 posts' profile pictures
  const getPostAvatars = () => {
    if (!posts || posts.length === 0) return [];

    return posts.slice(0, 4).map(post => ({
      avatar: post.author?.avatar_url || fallbackImg,
      isAnonymous: post.is_anonymous
    }));
  };

  // Calculate the remaining posts count
  const remainingPosts = Math.max(0, totalPosts - 4);

  return (
    <>
      <div className={`sidebar ${isHidden ? "hidden" : ""}`}>
        {!isHidden && (
          <div className="sidebar-content">
            {/* Profile Picture */}
            <div className="profile-picture">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="profile-img" />
              ) : (
                <img src={fallbackImg} alt="Fallback" className="profile-img" />
              )}
            </div>

            {/* Creator Info */}
            <h2 className="creator-name">
              {creatorName || "Creator"}
              <img
                src={verifiedIcon}
                alt="Verified Creator"
                className="verified-icon"
              />
            </h2>
            <p className="creator-bio">{bio || ""}</p>

            {/* Requests Section */}
            <p className="requests-title">
              {totalPosts} {totalPosts === 1 ? "Request" : "Requests"}
            </p>
            <div className="requests-avatars">
              {getPostAvatars().map((post, index) => (
                <img
                  key={index}
                  src={post.isAnonymous ? fallbackImg : post.avatar}
                  alt={`Post ${index + 1}`}
                  className="avatar"
                />
              ))}
              {remainingPosts > 0 && (
                <span className="more-requests">+{remainingPosts}</span>
              )}
            </div>

            {/* Description */}
            <p className="description-text">
              {description || ""}
            </p>
          </div>
        )}
      </div>
      <button 
        className="toggle-button" 
        onClick={toggleSidebar}
      >
        {isHidden ? ">" : "<"}
      </button>
    </>
  );
}

export default Sidebar;
