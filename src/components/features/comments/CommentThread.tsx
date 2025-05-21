// CommentThread.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Avatar, Button, Popconfirm, Tooltip } from 'antd';
import { HeartOutlined, HeartFilled, MessageOutlined, DeleteOutlined, EllipsisOutlined } from '@ant-design/icons';
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
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);
  const [commentLikes, setCommentLikes] = useState(0);

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

  const handleJoinConversation = () => {
    // Focus on the first comment input or open a new comment form
    if (localComments.length > 0) {
      setReplyingToId(localComments[0].id);
    } else {
      // Maybe trigger the main comment input if available
      const mainCommentInput = document.querySelector('.comment-input') as HTMLInputElement;
      if (mainCommentInput) {
        mainCommentInput.focus();
      }
    }
  };

  // Find the most recent reply timestamp for a specific comment
  const getMostRecentReplyTimestamp = (replies: Comment[]): string => {
    if (!replies || replies.length <= 1) return '';

    return replies
      .slice(1) // Skip the first reply as it's already shown
      .reduce((latest, reply) => {
        const latestDate = new Date(latest);
        const replyDate = new Date(reply.timestamp);
        return replyDate > latestDate ? reply.timestamp : latest;
      }, replies[1].timestamp); // Start with the second reply
  };

  // Helper function to format the time difference
  const formatTimeDifference = (timestamp: string) => {
    const now = new Date();
    const commentDate = new Date(timestamp);

    // Calculate the time difference in milliseconds
    const diffMs = now.getTime() - commentDate.getTime();

    // Convert to minutes
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes === 1) {
      return '1 minute ago';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else {
      // Convert to hours
      const diffHours = Math.floor(diffMinutes / 60);

      if (diffHours === 1) {
        return '1 hour ago';
      } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
      } else {
        // Convert to days
        const diffDays = Math.floor(diffHours / 24);
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev =>
      prev.includes(commentId)
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  // Get avatars for additional replies (beyond the first one) for a specific comment
  const getAdditionalReplyAvatars = (replies: Comment[]) => {
    if (!replies || replies.length <= 1) return [];

    // Return avatars for users from the 2nd reply onwards (max 3)
    return replies
      .slice(1)
      .map(reply => reply.author)
      .slice(0, 3); // Limit to 3 avatars
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
    <>
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

            const hasAdditionalReplies = comment.replies && comment.replies.length > 1;
            const additionalRepliesCount = hasAdditionalReplies ? comment.replies!.length - 1 : 0;
            const isExpanded = expandedReplies.includes(comment.id);
            const mostRecentTimestamp = hasAdditionalReplies ? getMostRecentReplyTimestamp(comment.replies!) : '';
            const additionalUserAvatars = hasAdditionalReplies ? getAdditionalReplyAvatars(comment.replies!) : [];

            return (
              <React.Fragment key={comment.id}>
                <div className="comment-with-replies">
                  {renderComment(comment)}

                  {!minimizedComments.includes(comment.id) && comment.replies && comment.replies.length > 0 && (
                    <div className="replies-container">
                      <div className="reply-connector"></div>

                      {/* Always show the first reply */}
                      {renderComment(comment.replies[0], true)}

                      {/* Show "X more replies" summary if there are additional replies */}
                      {hasAdditionalReplies && !isExpanded && (
                        <div className="more-replies" onClick={() => toggleReplies(comment.id)}>
                          <Avatar.Group className="avatars" maxCount={3}>
                            {additionalUserAvatars.map((user, index) => (
                              <Tooltip key={index} title={user.name} placement="top">
                                <Avatar src={user.avatar} size={24} />
                              </Tooltip>
                            ))}
                          </Avatar.Group>
                          <span className="more-replies-text">
                            {additionalRepliesCount} more {additionalRepliesCount === 1 ? 'reply' : 'replies'} • {formatTimeDifference(mostRecentTimestamp)}
                          </span>
                        </div>
                      )}

                      {/* Show all replies when expanded */}
                      {isExpanded && (
                        <>
                          {comment.replies.slice(1).map(reply => (
                            <div key={reply.id} className="reply">
                              <Avatar src={reply.author.avatar} size={28} />
                              <div className="reply-content">
                                <div className="reply-header">
                                  <span className="user-name">{reply.author.name}</span>
                                  <span className="timestamp">{formatTimeDifference(reply.timestamp)}</span>
                                </div>
                                <p className="text">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                          {additionalRepliesCount > 0 && (
                            <Button
                              type="text"
                              className="show-less-button"
                              onClick={() => toggleReplies(comment.id)}
                            >
                              Show less
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Mobile "Join the conversation" fixed bottom input */}
      <div className="mobile-join-conversation">
        <button
          className="mobile-join-button"
          onClick={handleJoinConversation}
        >
          Join the conversation
        </button>
      </div>
    </>
  );
}
