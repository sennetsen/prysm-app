// CommentThread.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Comment } from './Comment';
import { CommentInput } from './CommentInput';
import { Avatar, Button, Popconfirm } from 'antd';
import { HeartOutlined, HeartFilled, MessageOutlined, DeleteOutlined } from '@ant-design/icons';
import './CommentThread.css';

interface CommentThreadProps {
  postId: string;
  currentUser: any;
  comments: Comment[];
  onLike: (commentId: number) => void;
  onAddReply?: (parentId: number, reply: Comment) => void;
  onDelete?: (commentId: number) => void;
}

interface Comment {
  id: number;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  liked: boolean;
  replies?: Comment[];
}

export function CommentThread({ 
  postId, 
  currentUser, 
  comments, 
  onLike, 
  onAddReply,
  onDelete 
}: CommentThreadProps) {
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>(comments);
  const [minimizedComments, setMinimizedComments] = useState<number[]>([]);
  
  // Update local comments when props change
  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);
  
  const handleReplyClick = (commentId: number) => {
    setReplyingToId(commentId);
    setReplyText('');
  };
  
  const handleSubmitReply = (parentId: number) => {
    if (!replyText.trim()) return;
    
    // Generate a unique ID for the new reply
    const maxId = Math.max(
      ...localComments.map(c => c.id),
      ...localComments.flatMap(c => c.replies?.map(r => r.id) || []),
      0
    );
    const newReplyId = maxId + 1;
    
    // Create the new reply
    const newReply: Comment = {
      id: newReplyId,
      author: {
        name: currentUser?.user_metadata?.full_name || 'Current User',
        avatar: currentUser?.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?img=1',
      },
      content: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 0,
      liked: false
    };
    
    // Add the reply to the parent comment
    const updatedComments = localComments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      return comment;
    });
    
    console.log('Adding reply to comment', parentId, 'New replies length:', 
      updatedComments.find(c => c.id === parentId)?.replies?.length);
    
    // Update the local state
    setLocalComments(updatedComments);
    
    // If parent component provided onAddReply callback, call it
    if (onAddReply) {
      onAddReply(parentId, newReply);
    }
    
    // Clear the reply input and close it
    setReplyText('');
    setReplyingToId(null);
  };
  
  const handleDeleteComment = (commentId: number) => {
    // Update local state immediately for better UX
    const isTopLevelComment = localComments.some(c => c.id === commentId);
    
    if (isTopLevelComment) {
      setLocalComments(prevComments => 
        prevComments.filter(comment => comment.id !== commentId)
      );
    } else {
      setLocalComments(prevComments =>
        prevComments.map(comment => {
          if (comment.replies && comment.replies.some(reply => reply.id === commentId)) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply.id !== commentId)
            };
          }
          return comment;
        })
      );
    }
    
    // Also call the parent component's delete handler if provided
    if (onDelete) {
      onDelete(commentId);
    }
  };

  const toggleMinimize = (commentId: number) => {
    setMinimizedComments(prevMinimized => {
      if (prevMinimized.includes(commentId)) {
        // If already minimized, remove from array (expand)
        return prevMinimized.filter(id => id !== commentId);
      } else {
        // If not minimized, add to array (minimize)
        return [...prevMinimized, commentId];
      }
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    if (comment.author.name === 'Comment Deleted') {
      return (
        <div key={comment.id} className="comment deleted-comment">
          <Avatar src={comment.author.avatar} size={36} />
          <div className="comment-content">
            <div className="comment-header">
              <span className="comment-author">{comment.author.name}</span>
              <span className="comment-timestamp">{comment.timestamp}</span>
            </div>
          </div>
        </div>
      );
    }

    const isCurrentUserAuthor = 
      currentUser?.user_metadata?.full_name === comment.author.name;
    
    const isMinimized = minimizedComments.includes(comment.id);

    return (
      <div key={comment.id} className={`comment ${isReply ? 'reply-comment' : ''}`} onClick={() => !isReply && toggleMinimize(comment.id)}>
        <div className="comment-avatar">
          <Avatar src={comment.author.avatar} size={36} />
        </div>
        <div className="comment-content">
          <div className="comment-header">
            <span className="comment-author">{comment.author.name}</span>
            <span className="comment-timestamp">{comment.timestamp}</span>
          </div>
          {!isMinimized && (
            <>
              <p className="comment-text">
                {comment.content.startsWith('@') ? (
                  <>
                    <span className="mention">@Everyone</span>
                    {comment.content.substring(9)}
                  </>
                ) : comment.content}
              </p>
              <div className="actions-wrapper">
                <div className="comment-actions">
                  <Button 
                    className={`heart-button ${comment.liked ? 'liked' : ''}`}
                    icon={comment.liked ? <HeartFilled /> : <HeartOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike(comment.id);
                    }}
                  >
                    {comment.likes}
                  </Button>
                  <Button 
                    className="reply-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplyClick(comment.id);
                    }}
                  >
                    Reply
                  </Button>
                  {isCurrentUserAuthor && (
                    <Popconfirm
                      title="Delete this comment?"
                      description="This action cannot be undone."
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteComment(comment.id)}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <Button 
                        className="delete-button"
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Delete
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
              
              {replyingToId === comment.id && (
                <div className="reply-input-container" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitReply(comment.id)}
                    className="reply-input"
                    autoFocus
                  />
                  <Button 
                    className="reply-submit-button"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyText.trim()}
                  >
                    Reply
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="comment-thread">
      {localComments.length === 0 ? (
        <div className="no-comments-placeholder">
          <MessageOutlined style={{ fontSize: '24px', color: '#b39898', marginBottom: '12px' }} />
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        localComments.map(comment => {
          // Log comment and its replies for debugging
          console.log(`Rendering comment ${comment.id} with ${comment.replies?.length || 0} replies`);
          if (comment.replies && comment.replies.length > 0) {
            console.log('Reply IDs:', comment.replies.map(r => r.id));
          }
          
          return (
            <React.Fragment key={comment.id}>
              <div className="comment-with-replies">
                {renderComment(comment)}
                
                {!minimizedComments.includes(comment.id) && comment.replies && comment.replies.length > 0 && (
                  <div className="replies-container">
                    <div className="reply-connector"></div>
                    {/* Force map to render each reply separately */}
                    {comment.replies.map(reply => (
                      <React.Fragment key={reply.id}>
                        {renderComment(reply, true)}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })
      )}
    </div>
  );
}
