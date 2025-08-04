import React, { useState } from "react";
import "./Sidebar.css";
import fallbackImg from '../../../img/fallback.png';
import verifiedIcon from '../../../img/verified.svg';
import BoardActivityStream from './BoardActivityStream';

function Sidebar({ description, bio, totalPosts, creatorName, creatorAvatar, posts, color, isHidden, toggleSidebar, boardId, currentUserId, boardCreatorId }) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const getAvatarUrl = () => {
    if (creatorAvatar) {
      return `https://cbzociyywxxvaciwwhwy.supabase.co/storage/v1/object/public/creator-avatars/${creatorAvatar}`;
    }
    return fallbackImg;
  };

  // Get the first 4 unique users' profile pictures
  const getUniquePostAvatars = () => {
    if (!posts || posts.length === 0) return [];
    const seen = new Map();
    posts.forEach(post => {
      const key = post.is_anonymous ? 'anon-' + (post.author?.avatar_url || fallbackImg) : post.author?.id || post.author?.avatar_url || fallbackImg;
      if (!seen.has(key)) {
        seen.set(key, {
          avatar: post.author?.avatar_url || fallbackImg,
          isAnonymous: post.is_anonymous
        });
      }
    });
    return Array.from(seen.values());
  };

  // Calculate the remaining unique users count
  const uniqueAvatars = getUniquePostAvatars();
  // Prioritize non-anonymous avatars first
  uniqueAvatars.sort((a, b) => {
    if (a.isAnonymous === b.isAnonymous) return 0;
    return a.isAnonymous ? 1 : -1;
  });
  const remainingUnique = Math.max(0, uniqueAvatars.length - 4);

  return (
    <>
      <div className={`sidebar ${isHidden ? "hidden" : ""}`}
        style={{
          scrollbarColor: `${color} transparent`, // For Firefox
        }}>
        {!isHidden && (
          <div className="sidebar-content">
            {/* Profile Picture */}
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

            {/* Creator Name and Verified */}
            <h2 className="creator-name">
              {creatorName || ""}
              <img
                src={verifiedIcon}
                alt="Verified Creator"
                className="verified-icon"
              />
            </h2>

            {/* Requests count and avatars in one row */}
            <div className="requests-row">
              <span className="requests-title">{totalPosts} {totalPosts === 1 ? "Post" : "Posts"}</span>
              <div className="requests-avatars">
                {uniqueAvatars.slice(0, 4).map((post, index) => (
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
                {remainingUnique > 0 && (
                  <span className="avatar more-requests">+{remainingUnique}</span>
                )}
              </div>
            </div>

            {/* Description and Show more/less */}
            <p
              className={`description-text${showFullDescription ? ' expanded' : ''}`}
              style={{ scrollbarColor: `${color} transparent` }}
            >
              {description || ""}
            </p>
            <button
              className="show-more-link"
              onClick={() => setShowFullDescription(v => !v)}
            >
              {showFullDescription ? 'Show less' : 'Show more'}
              <span
                className="show-more-arrow"
                style={{
                  display: 'inline-block',
                  marginLeft: 4,
                  transform: showFullDescription ? 'rotate(-90deg)' : 'rotate(90deg)'
                }}
              >
                {'>'}
              </span>
            </button>

            <div className="sidebar-activity-section">
              <h3>Activity</h3>
              <BoardActivityStream
                boardId={boardId}
                currentUserId={currentUserId}
                boardCreatorId={boardCreatorId} />
            </div>
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
