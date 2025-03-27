import React, { useState } from 'react';
import { Modal, Button, Avatar, Tooltip } from 'antd';
import { CommentThread } from './CommentThread';
import { ActivityBar } from './ActivityBar';
import { HeartOutlined, HeartFilled, MessageOutlined } from '@ant-design/icons';
import '../styles/PostPopup.css';

interface PostPopupProps {
  post: {
    id: string;
    title: string;
    content: string;
    author: {
      full_name: string;
      avatar_url: string;
    };
    created_at: string;
  };
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export function PostPopup({ post, isOpen, onClose, currentUser }: PostPopupProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(35); // Example count to match the image
  const [commentCount, setCommentCount] = useState(35); // Example count to match the image

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      maskClosable={false}
      mask={false}
      width={window.innerWidth - 50}
      className="post-popup"
      style={{
        top: '72px',
        bottom: '64px',
        height: 'auto',
        minHeight: '600px'
      }}
      closeIcon={<span style={{ fontSize: '24px' }}>×</span>}
    >
      <div className="post-popup-container">
        <div className="post-content-section">
          <div className="post-header">
            <h2 className="post-title">{post.title}</h2>
            <div className="post-content">
              <p>{post.content}</p>
            </div>

            <div className="post-actions">
              <Button
                className={`custom-like-button ${liked ? 'liked' : ''}`}
                icon={liked ? <HeartFilled /> : <HeartOutlined />}
                onClick={handleLike}
              >
                <span className="like-count">{likeCount}</span>
              </Button>

              <Button className="custom-comment-button" icon={<MessageOutlined />}>
                <span className="comment-count">{commentCount}</span>
              </Button>
            </div>

            <div className="comments-section">
              <div className="comment-input-container">
                <input
                  type="text"
                  placeholder="Leave a comment..."
                  className="comment-input"
                />
              </div>
              <CommentThread postId={post.id} currentUser={currentUser} />
            </div>
          </div>
        </div>

        <div className="post-activity-section">
          <div className="about-section">
            <h3>About</h3>
            <div className="author-info">
              <Avatar
                src={post.author.avatar_url}
                size={32}
                className="author-avatar"
              />
              <span className="author-name">{post.author.full_name}</span>
            </div>
            <div className="post-date">
              <span>{new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          <div className="subscribers-section">
            <h3>Subscribers</h3>
            <div className="avatar-group">
              {/* Placeholder avatars - replace with actual subscribers */}
              <Avatar.Group maxCount={4} maxStyle={{ color: '#f56a00', backgroundColor: '#fde3cf' }}>
                <Avatar src="https://i.pravatar.cc/150?img=1" />
                <Avatar src="https://i.pravatar.cc/150?img=2" />
                <Avatar src="https://i.pravatar.cc/150?img=3" />
                <Avatar src="https://i.pravatar.cc/150?img=4" />
                <Avatar src="https://i.pravatar.cc/150?img=5" />
              </Avatar.Group>
              <Button className="unsubscribe-button">Unsubscribe</Button>
            </div>
          </div>

          <div className="activity-section">
            <h3>Activity</h3>
            <ActivityBar postId={post.id} />
          </div>
        </div>
      </div>
    </Modal>
  );
} 