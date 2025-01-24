import React, { useState, useEffect } from "react";
import "./RequestCard.css";
import { HeartFilled, HeartOutlined, CloseCircleFilled } from "@ant-design/icons";
import { Button } from "antd";

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
  likesCount,
  reactions = []
}) {
  const [timestamp, setTimestamp] = useState('');

  const canDelete = isBoardOwner || (currentUserId && authorId === currentUserId);
  const hasLiked = reactions.some(r =>
    r.user_id === currentUserId &&
    r.reaction_type === 'like'
  );

  useEffect(() => {
    const createdTime = new Date(created_at);
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
    const interval = setInterval(updateTimestamp, 60000);
    return () => clearInterval(interval);
  }, [created_at]);

  const handleDelete = async () => {
    if (canDelete) {
      await onDelete(id);
    }
  };

  return (
    <div className="request-card" style={{ backgroundColor: color }}>
      {canDelete && (
        <CloseCircleFilled
          className="ant-delete-button"
          onClick={handleDelete}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: "16px",
            color: "rgba(0, 0, 0, 0.45)",
            transition: "color 0.3s",
            cursor: "pointer"
          }}
          aria-label="Delete post"
        />
      )}
      <h3>{title}</h3>
      <p>{content}</p>
      <div className="card-footer">
        <div className={isAnonymous ? "anonymous" : "user-info"}>
          {!isAnonymous && author?.avatar_url && (
            <img src={author.avatar_url} alt="Profile" className="profile-pic" />
          )}
          <span>{isAnonymous ? 'Anonymous' : (author?.full_name || 'Unknown')}</span>
        </div>
        <div className="timestamp">{timestamp}</div>
        <Button
          type="text"
          icon={
            hasLiked ? (
              <HeartFilled style={{ color: '#ff4d4f' }} />
            ) : (
              <HeartOutlined style={{ color: '#8c8c8c' }} />
            )
          }
          onClick={() => onLike(id, hasLiked)}
          className="custom-like-button"
        />
        <span className="like-count">{likesCount}</span>

      </div>
    </div>
  );
}

export default RequestCard;