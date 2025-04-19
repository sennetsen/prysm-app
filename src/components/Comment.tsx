// Comment.tsx
import React from 'react';
import './Comment.css';
import { Avatar, Typography } from 'antd';
const { Text } = Typography;

interface CommentProps {
  comment: {
    id: number;
    content: string;
    created_at: string;
    is_anonymous: boolean;
    author?: {
      full_name: string;
      avatar_url: string;
    };
    attachments?: Array<{
      id: string;
      file_name: string;
      storage_path: string;
    }>;
  };
  currentUser: any;
  onReply: () => void;
}

export function Comment({ comment, currentUser, onReply }: CommentProps) {
  const [isFixed, setIsFixed] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  console.log('Comment component rendered');

  const authorName = comment.is_anonymous
    ? 'Anonymous'
    : comment.author?.full_name || 'User';
  const timestamp = new Date(comment.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      ref={containerRef}
      className={`comment-container ${isFixed ? 'fixed' : ''}`}
      style={{ zIndex: isFixed ? 1000 : 'auto' }}
    >
      <div className="profile">
        {comment.author?.avatar_url ? (
          <Avatar
            src={comment.author.avatar_url}
            alt={authorName}
            size={33}
            style={{ backgroundColor: 'transparent' }}
          />
        ) : (
          <Avatar size={33} style={{ backgroundColor: 'transparent' }}>
            {authorName.charAt(0)}
          </Avatar>
        )}
      </div>
      <div className="comment-body">
        <div className="header-row">
          <span className="username">{authorName}</span>
          <span className="timestamp">{timestamp}</span>
        </div>
        <div className="comment-text">{comment.content}</div>
        {comment.attachments && comment.attachments.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {comment.attachments.map((att) => (
              <a
                key={att.id}
                href={att.storage_path}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginRight: '8px', color: '#1890ff' }}
              >
                {att.file_name}
              </a>
            ))}
          </div>
        )}
        <div className="actions-row">
          <div className="likes" onClick={() => { /* handle like action */ }}>
            <div className="like-icon" />
            <span className="like-count">35</span>
          </div>
          <div className="reply" onClick={onReply}>
            <div className="reply-icon" />
            <span className="reply-text">Reply</span>
          </div>
        </div>
      </div>
    </div>
  );
}
