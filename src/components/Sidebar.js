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
<<<<<<< Updated upstream
          <h2 className="creator-name">
            {creatorName || "Creator"}
            <img
              src={verifiedIcon}
              alt="Verified Creator"
              className="verified-icon"
            />
          </h2>
          <p className="creator-bio">{bio || ""}</p>
=======
          <h2 className="creator-name">XYZ Creator</h2>
          <p className="creator-bio">Everything I Learned, I Learned From The Movies.</p>
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
            {description || ""}
=======
          Cineoholic here—request anything of me here, from film recommendations, reviews, discussions on cinematic techniques, or even deep dives into your favorite movies… literally whatever comes to mind!<br></br>



<br></br> Feel free to like requests you’re excited about; the more likes it gets, the more likely I’ll bring it to life! For some requests, I may reach out via email to confirm details. Just a heads-up: spam or hate won’t be tolerated.
>>>>>>> Stashed changes
          </p>
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
