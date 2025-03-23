import React from 'react';
import { Modal } from 'antd';
import { CommentThread } from './CommentThread';
import { ActivityBar } from './ActivityBar';

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
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      maskClosable={false}
      width={window.innerWidth - 50}
      className="post-popup"
      style={{
        top: '72px',
        bottom: '64px',
        height: 'auto',
        minHeight: '600px'
      }}
    >
      <div className="post-popup-container">
        <div className="post-content-section">
          <div className="post-header">
            <h2>{post.title}</h2>
            <div className="post-meta">
              <span className="author">{post.author.full_name}</span>
              <span className="timestamp">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="post-content">
            <p>{post.content}</p>
          </div>
          <div className="comments-section">
            <CommentThread postId={post.id} currentUser={currentUser} />
          </div>
        </div>
        <ActivityBar postId={post.id} />
      </div>
    </Modal>
  );
} 