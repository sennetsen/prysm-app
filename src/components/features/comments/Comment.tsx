// Comment.tsx
import React from 'react';
import { UserOutlined, HeartOutlined, HeartFilled, MessageOutlined } from '@ant-design/icons';
import { Badge, Avatar, Tooltip, Button } from 'antd';
import './Comment.css';

interface MentionData {
  id: string;
  username: string;
  type: 'user' | 'everyone';
}

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
    mentions?: MentionData[];
    liked?: boolean;
    likes?: number;
  };
  onLike: (commentId: number) => void;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  isReply?: boolean;
}

export function Comment({ comment, onLike, onReply, onDelete, isReply = false }: CommentProps) {
  // Format the content to include mention highlights
  const formatContent = () => {
    if (!comment.mentions || comment.mentions.length === 0) {
      return <span>{comment.content}</span>;
    }

    let formattedContent = comment.content;
    const contentParts = [];
    let lastIndex = 0;

    // Sort mentions to process them in order from left to right
    const sortedMentions = [...(comment.mentions || [])].sort((a, b) => {
      const aIndex = comment.content.indexOf(`@${a.username}`);
      const bIndex = comment.content.indexOf(`@${b.username}`);
      return aIndex - bIndex;
    });

    // Replace each mention with a styled component
    sortedMentions.forEach(mention => {
      const mentionText = `@${mention.username}`;
      const mentionIndex = comment.content.indexOf(mentionText, lastIndex);

      if (mentionIndex >= 0) {
        // Add text before mention
        if (mentionIndex > lastIndex) {
          contentParts.push(
            <span key={`text-${lastIndex}`}>
              {comment.content.substring(lastIndex, mentionIndex)}
            </span>
          );
        }

        // Add the mention with styling
        contentParts.push(
          <span
            key={`mention-${mentionIndex}`}
            className={`mention-tag ${mention.type === 'everyone' ? 'mention-everyone' : ''}`}
          >
            {mentionText}
          </span>
        );

        lastIndex = mentionIndex + mentionText.length;
      }
    });

    // Add any remaining text after the last mention
    if (lastIndex < comment.content.length) {
      contentParts.push(
        <span key={`text-${lastIndex}`}>
          {comment.content.substring(lastIndex)}
        </span>
      );
    }

    return <>{contentParts}</>;
  };

  return (
    <div className={`comment ${isReply ? 'comment-reply' : ''}`}>
      <div className="comment-avatar">
        <Avatar
          src={comment.author?.avatar_url}
          icon={!comment.author?.avatar_url && <UserOutlined />}
          size={32}
        />
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">{comment.author?.full_name}</span>
          <span className="comment-time">{comment.created_at}</span>
        </div>
        <div className="comment-text">
          {formatContent()}
        </div>
        <div className="comment-actions">
          <div
            className={`comment-action ${comment.liked ? 'liked' : ''}`}
            onClick={() => onLike(comment.id)}
          >
            {comment.liked ? <HeartFilled /> : <HeartOutlined />}
            <span>{(comment.likes || 0) > 0 ? comment.likes : ''}</span>
          </div>
          {!isReply && (
            <div className="comment-action" onClick={() => onReply(comment.id)}>
              <MessageOutlined />
            </div>
          )}
          <div className="comment-action" onClick={() => onDelete(comment.id)}>
            Delete
          </div>
        </div>
      </div>
    </div>
  );
}
