import React, { useState } from "react";
import "./Sidebar.css";
import fallbackImg from '../img/fallback.png';
import verifiedIcon from '../img/verified.svg';

function Sidebar({ description, bio, totalPosts, creatorName, creatorAvatar, posts, color }) {
  const [isHidden, setIsHidden] = useState(false);

  const toggleSidebar = () => {
    setIsHidden(!isHidden);
  };

  const getAvatarUrl = () => {
    if (creatorAvatar) {
      return `https://cbzociyywxxvaciwwhwy.supabase.co/storage/v1/object/public/creator-avatars/${creatorAvatar}`;
    }
    return fallbackImg;
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
      <div className={`sidebar ${isHidden ? "hidden" : ""}`}
        style={{
          scrollbarColor: `${color} transparent`, // For Firefox
        }}>
        {!isHidden && (
          <div className="sidebar-content">
            <div className="profile-picture">
              <img
                src={getAvatarUrl()}
                alt="Profile"
                className="profile-img"
                onError={(e) => {
                  e.target.src = fallbackImg;
                }}
              />
            </div>

            <h2 className="creator-name">
              {creatorName || ""}
              <img
                src={verifiedIcon}
                alt="Verified Creator"
                className="verified-icon"
              />
            </h2>

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
                  onError={(e) => {
                    e.target.src = fallbackImg;
                  }}
                />
              ))}
              {remainingPosts > 0 && (
                <span className="more-requests">+{remainingPosts}</span>
              )}
            </div>

            <p className="description-text" style={{
              scrollbarColor: `${color} transparent`, // For Firefox
            }}>
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
