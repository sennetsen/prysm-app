import React, { useState, useEffect } from "react";
import "./RequestCard.css";
import { HeartFilled, HeartOutlined, CloseCircleFilled } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import fallbackImg from '../img/fallback.png';

export default React.memo(
  function RequestCard({
    id,
    title,
    content,
    isAnonymous,
    color,
    authorId,
    author,
    created_at,
    onDelete,
    currentUserId,
    isBoardOwner,
    onLike,
    likesCount = 0,
    reactions = [],
    index
  }) {
    const animationDelay = `${index * 0.1}s`;
    const [timestamp, setTimestamp] = useState('');
    const [isNew, setIsNew] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);


    const canDelete = isBoardOwner || (currentUserId && authorId === currentUserId);
    const hasLiked = reactions.some(r =>
      r.user_id === currentUserId &&
      r.reaction_type === 'like'
    );

    useEffect(() => {
      // Trigger animation when component mounts
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 500); // Match animation duration
      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      const createdTime = new Date(created_at);
      const updateTimestamp = () => {
        const now = new Date();
        const diffInSeconds = Math.floor((now - createdTime) / 1000);

        // if (diffInSeconds < 60) {
        //   setTimestamp('just now');
        // } else if (diffInSeconds < 3600) {
        //   const minutes = Math.floor(diffInSeconds / 60);
        //   setTimestamp(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
        // } else if (diffInSeconds < 86400) {
        //   const hours = Math.floor(diffInSeconds / 3600);
        //   setTimestamp(`${hours} hour${hours > 1 ? 's' : ''} ago`);
        // } else {
        //   const days = Math.floor(diffInSeconds / 86400);
        //   setTimestamp(`${days} day${days > 1 ? 's' : ''} ago`);
        // }

        if (diffInSeconds < 60) {
          setTimestamp('just now');
        } else if (diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60);
          setTimestamp(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
        } else if (diffInSeconds < 86400) {
          const hours = Math.floor(diffInSeconds / 3600);
          setTimestamp(`${hours} hour${hours > 1 ? 's' : ''} ago`);
        } else if (diffInSeconds < 2592000) { // 30 days
          const days = Math.floor(diffInSeconds / 86400);
          setTimestamp(`${days} day${days > 1 ? 's' : ''} ago`);
        } else if (diffInSeconds < 31536000) { // 365 days
          const months = Math.floor(diffInSeconds / 2592000);
          setTimestamp(`${months} month${months > 1 ? 's' : ''} ago`);
        } else {
          const years = Math.floor(diffInSeconds / 31536000);
          setTimestamp(`${years} year${years > 1 ? 's' : ''} ago`);
        }
      };

      updateTimestamp();
      const interval = setInterval(updateTimestamp, 60000);
      return () => clearInterval(interval);
    }, [created_at]);

    const handleDelete = async () => {
      if (canDelete) {
        setIsDeleting(true);
        // Wait for animation to complete before calling onDelete
        setTimeout(async () => {
          await onDelete(id);
        }, 300); // Match animation duration
      }
    };

    return (
      <div className={`request-card ${isNew ? 'new-card' : ''} ${isDeleting ? 'deleting' : ''}`} style={{ backgroundColor: color, '--card-color': color }}>
        {canDelete && (
          <Tooltip title="Delete Post" placement="top">
            <button
              className="thin-x-button"
              onClick={handleDelete}
              aria-label="Delete post"
            >
              ×
            </button>
          </Tooltip>
        )}
        <div className="card-content">
          <h3>{title}</h3>
          <div className="request-content">
            <div className="scroll-container">
              <p>{content}</p>
            </div>
          </div>
        </div>

        <span className="timestamp">{timestamp}</span>



        {isAnonymous ? (
          <Tooltip
            title={new Date(created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            placement="bottom"
          >
            <div className="user-info">
              <img
                src={fallbackImg}
                alt="Anonymous"
                className="profile-pic"
              />
              <span>Anonymous</span>
            </div>
          </Tooltip>
        ) : (
          author && (
            <Tooltip
              title={new Date(created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              placement="bottom"
            >
              <div className="user-info">
                {author.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt="Profile"
                    className="profile-pic"
                    onError={(e) => {
                      e.target.src = fallbackImg;
                    }}
                  />
                ) : (
                  <img
                    src={fallbackImg}
                    alt="Profile"
                    className="profile-pic"
                  />
                )}
                <span>{author.full_name}</span>
              </div>
            </Tooltip>
          )
        )}

        <div className="card-footer">
          <div className="like-section">
            <Button
              type="text"
              icon={hasLiked ? <HeartFilled /> : <HeartOutlined />}
              onClick={() => onLike(id, hasLiked)}
              className={`custom-like-button ${hasLiked ? 'liked' : ''}`}
            >
              <span className="like-count">{likesCount}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  });