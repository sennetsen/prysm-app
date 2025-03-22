import React from 'react';
import { Button, Avatar } from 'antd';
import { CommentInput } from './CommentInput';
import { storage } from '../lib/storage';
import { supabase } from '../supabaseClient';
import './Comment.css'; // Import the new CSS file

interface CommentProps {
  comment: {
    id: number;
    post_id: string;
    content: string;
    author_id: string;
    is_anonymous: boolean;
    reaction_counts: Record<string, number>;
    created_at: string;
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
  return (
    <div className="comment">
      <Avatar src={comment.author?.avatar_url} />
      <div className="comment-content">
        <div className="comment-header">
          <span className="author-name">
            {comment.is_anonymous ? 'Anonymous' : comment.author?.full_name}
          </span>
          <span className="timestamp">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        </div>
        <p>{comment.content}</p>
        {comment.attachments?.map(attachment => (
          <a
            key={attachment.id}
            href={storage.getPublicUrl(attachment.storage_path)}
            target="_blank"
            rel="noopener noreferrer"
            className="attachment-link"
          >
            {attachment.file_name}
          </a>
        ))}
        <div className="comment-actions">
          <Button size="small" onClick={() => onReply()}>
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
