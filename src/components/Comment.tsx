import React, { useState } from 'react';
import { Button, Avatar } from 'antd';
import { CommentInput } from './CommentInput';
import { storage } from '../lib/storage';
import { supabase } from '../supabaseClient';

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
  const [showReply, setShowReply] = useState(false);

  const handleReaction = async (reactionType: string) => {
    if (!currentUser) return;

    const { data: existing } = await supabase
      .from('comment_reactions')
      .select()
      .match({
        post_id: comment.post_id,
        comment_id: comment.id,
        user_id: currentUser.id,
        reaction_type: reactionType
      });

    if (existing?.length) {
      await supabase
        .from('comment_reactions')
        .delete()
        .match({
          post_id: comment.post_id,
          comment_id: comment.id,
          user_id: currentUser.id,
          reaction_type: reactionType
        });
    } else {
      await supabase
        .from('comment_reactions')
        .insert({
          post_id: comment.post_id,
          comment_id: comment.id,
          user_id: currentUser.id,
          reaction_type: reactionType
        });
    }
  };

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
          <Button
            size="small"
            onClick={() => handleReaction('like')}
          >
            👍 {comment.reaction_counts?.like || 0}
          </Button>
          <Button
            size="small"
            onClick={() => setShowReply(!showReply)}
          >
            Reply
          </Button>
        </div>

        {showReply && (
          <CommentInput
            postId={comment.post_id}
            parentCommentId={comment.id}
            currentUser={currentUser}
            onSubmit={() => {
              setShowReply(false);
              onReply();
            }}
          />
        )}
      </div>
    </div>
  );
}
