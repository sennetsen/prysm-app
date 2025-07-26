// CommentThread.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { Avatar, Button, Popconfirm, Tooltip } from 'antd';
import { HeartOutlined, HeartFilled, MessageOutlined, DeleteOutlined, EllipsisOutlined, FileOutlined, PaperClipOutlined } from '@ant-design/icons';
import './CommentThread.css';

interface CommentThreadProps {
  postId: string;
  currentUser: any;
  comments: Comment[];
  onLike: (commentId: number) => void;
  onAddReply?: (parentId: number, reply: Comment) => void;
  onDelete?: (commentId: number) => void;
  userCommentsThisSession?: Set<number>;
}

interface Comment {
  id: number;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  created_at?: string; // Add optional created_at for sorting
  likes: number;
  liked: boolean;
  replies?: Comment[];
  attachments?: {
    id: string;
    storage_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }[];
}

export function CommentThread({
  postId,
  currentUser,
  comments,
  onLike,
  onAddReply,
  onDelete,
  userCommentsThisSession = new Set()
}: CommentThreadProps) {
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [localComments, setLocalComments] = useState<Comment[]>(comments);
  const [minimizedComments, setMinimizedComments] = useState<number[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);
  const [commentLikes, setCommentLikes] = useState(0);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // Update local comments when props change
  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  const handleReplyClick = (commentId: number) => {
    setReplyingToId(commentId);
    setReplyText('');
    setReplyAttachments([]);
  };

  const handleReplyAttachment = () => {
    replyFileInputRef.current?.click();
  };

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setReplyAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeReplyAttachment = (fileToRemove: File) => {
    setReplyAttachments(prev => prev.filter(file => file !== fileToRemove));
  };

  const handleReplyInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    if (replyInputRef.current) {
      replyInputRef.current.style.height = 'auto';
      replyInputRef.current.style.height = replyInputRef.current.scrollHeight + 'px';
    }
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
      timestamp: new Date().toISOString(),
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
    // Update local state to mark as deleted instead of removing
    setLocalComments(prevComments =>
      prevComments.map(comment => {
        if (comment.id === commentId) {
          // Mark the top-level comment as deleted
          return {
            ...comment,
            author: { name: 'Comment Deleted', avatar: '' }, // Change author
            content: '', // Clear content
            likes: 0, // Reset likes
            liked: false, // Reset liked status
            // Keep replies intact
          };
        }
        // If it's a reply being deleted, keep the current logic
        if (comment.replies && comment.replies.some(reply => reply.id === commentId)) {
          return {
            ...comment,
            replies: comment.replies.filter(reply => reply.id !== commentId)
          };
        }
        return comment;
      })
    );

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
    let commentDate = new Date(timestamp);

    // If the standard parsing failed, try to parse the formatted timestamp
    if (isNaN(commentDate.getTime())) {
      // Try to parse formats like "July 21st, 2025 at 1:48 PM"
      const formattedDateMatch = timestamp.match(/(\w+)\s+(\d{1,2})\w{2},\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/);
      if (formattedDateMatch) {
        const [, month, day, year, hour, minute, ampm] = formattedDateMatch;
        const monthIndex = new Date(Date.parse(month + " 1, 2000")).getMonth();
        let hour24 = parseInt(hour);
        if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
        if (ampm === 'AM' && hour24 === 12) hour24 = 0;

        commentDate = new Date(parseInt(year), monthIndex, parseInt(day), hour24, parseInt(minute));
      }
    }

    // Check if we still couldn't parse the date
    if (isNaN(commentDate.getTime())) {
      // Fallback: try to extract meaningful info or return a generic time
      return 'some time ago';
    }

    // Calculate the time difference in milliseconds
    const diffMs = now.getTime() - commentDate.getTime();

    // Convert to seconds
    const diffInSeconds = Math.floor(diffMs / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) { // 30 days
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 31536000) { // 365 days
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev =>
      prev.includes(commentId)
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  // Get avatars for additional replies (hidden replies, unique users only)
  const getAdditionalReplyAvatars = (replies: Comment[]) => {
    if (!replies || replies.length <= 2) return [];

    // Only consider hidden replies (from index 2 onward)
    const hiddenReplies = replies.slice(2);

    // Use a Map to ensure uniqueness by user name (or avatar URL)
    const uniqueAuthorsMap = new Map();
    hiddenReplies.forEach(reply => {
      if (!uniqueAuthorsMap.has(reply.author.name)) {
        uniqueAuthorsMap.set(reply.author.name, reply.author);
      }
    });

    // Return the unique authors as an array
    return Array.from(uniqueAuthorsMap.values());
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isDeleted = comment.author.name === 'Comment Deleted';

    const isCurrentUserAuthor =
      currentUser?.user_metadata?.full_name === comment.author.name;

    const isMinimized = minimizedComments.includes(comment.id);

    return (
      <div key={comment.id} className={`comment ${isReply ? 'reply-comment' : ''} ${isDeleted ? 'deleted-comment' : ''}`}>
        <div className="comment-avatar">
          <Avatar src={comment.author.avatar} size={isDeleted ? 26 : 36} />
        </div>
        <div className="comment-content">
          <div className="comment-header">
            <span className="comment-author">{comment.author.name}</span>
            <span className="comment-timestamp">{formatTimeDifference(comment.timestamp)}</span>
          </div>
          {!isDeleted && !isMinimized && (
            <>
              <p className="comment-text">
                {comment.content.startsWith('@') ? (
                  <>
                    <span className="mention">@Everyone</span>
                    {comment.content.substring(9)}
                  </>
                ) : comment.content}
              </p>

              {/* Display file previews if attachments exist */}
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="comment-attachments">
                  {(() => {
                    // Separate attachments by type while maintaining original order within each group
                    type AttachmentWithIndex = {
                      id: string;
                      storage_path: string;
                      file_name: string;
                      file_type: string;
                      file_size: number;
                      originalIndex: number;
                    };
                    const images: AttachmentWithIndex[] = [];
                    const nonImages: AttachmentWithIndex[] = [];

                    comment.attachments.forEach((attachment, originalIndex) => {
                      // Check if it's an image file by extension and MIME type
                      const isImage = attachment.file_type.startsWith('image/') ||
                        /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(attachment.file_name);

                      const attachmentWithIndex: AttachmentWithIndex = { ...attachment, originalIndex };

                      if (isImage) {
                        images.push(attachmentWithIndex);
                      } else {
                        nonImages.push(attachmentWithIndex);
                      }
                    });

                    return (
                      <>
                        {/* Images container */}
                        {images.length > 0 && (
                          <div className="comment-images-container">
                            {images.map((attachment) => (
                              <div key={attachment.id} className="comment-attachment-preview">
                                <div className="comment-attachment-image-container">
                                  <img
                                    src={`https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`}
                                    alt={attachment.file_name}
                                    className="comment-attachment-image"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Non-image files container */}
                        {nonImages.length > 0 && (
                          <div className="comment-files-container">
                            {nonImages.map((attachment) => (
                              <div key={attachment.id} className="comment-attachment-preview">
                                <div className="comment-attachment-file-preview">
                                  <FileOutlined />
                                  <span className="attachment-file-name" title={attachment.file_name}>
                                    {attachment.file_name}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

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
                  {!isReply && (
                    <Button
                      className="reply-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplyClick(comment.id);
                      }}
                    >
                      <MessageOutlined /> Reply
                    </Button>
                  )}
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

              {!isReply && replyingToId === comment.id && (
                <div className="reply-input-container" onClick={(e) => e.stopPropagation()}>
                  <div className="reply-input-row">
                    <div className="reply-input-wrapper">
                      <textarea
                        ref={replyInputRef}
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={handleReplyInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitReply(comment.id);
                          }
                        }}
                        className="reply-input"
                        autoFocus
                        rows={1}
                      />
                      <Button
                        className="reply-attachment-button"
                        icon={<PaperClipOutlined />}
                        onClick={handleReplyAttachment}
                        type="text"
                      />
                    </div>
                    <Button
                      className="reply-submit-button"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim() && replyAttachments.length === 0}
                    >
                      Reply
                    </Button>
                  </div>
                  {replyAttachments.length > 0 && (
                    <div className="reply-attachments-preview">
                      {replyAttachments.map((file, index) => (
                        <div key={index} className="reply-attachment-item">
                          <FileOutlined />
                          <span className="reply-attachment-name">{file.name}</span>
                          <Button
                            size="small"
                            type="text"
                            onClick={() => removeReplyAttachment(file)}
                            className="reply-attachment-remove"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={replyFileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleReplyFileChange}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
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

            // Calculate hidden replies (excluding session replies which are always shown)
            const sessionRepliesCount = comment.replies ? comment.replies.filter(reply => userCommentsThisSession.has(reply.id)).length : 0;
            const nonSessionRepliesCount = comment.replies ? comment.replies.length - sessionRepliesCount : 0;
            const hiddenNonSessionReplies = Math.max(0, nonSessionRepliesCount - 2);
            const hasAdditionalReplies = hiddenNonSessionReplies > 0;
            const additionalRepliesCount = hiddenNonSessionReplies;
            const isExpanded = expandedReplies.includes(comment.id);
            const mostRecentTimestamp = hasAdditionalReplies ? getMostRecentReplyTimestamp(comment.replies!) : '';
            const additionalUserAvatars = hasAdditionalReplies ? getAdditionalReplyAvatars(comment.replies!) : [];

            return (
              <React.Fragment key={comment.id}>
                <div className="comment-with-replies">
                  {renderComment(comment)}

                  {!minimizedComments.includes(comment.id) && comment.replies && comment.replies.length > 0 && (
                    <div className="replies-container" style={{ position: 'relative' }}>
                      <div className="all-replies-wrapper">
                        {/* Show first 2 replies + session replies, or all if expanded */}
                        {(isExpanded ? comment.replies : (() => {
                          const sessionReplies = comment.replies.filter(reply => userCommentsThisSession.has(reply.id));
                          const nonSessionReplies = comment.replies.filter(reply => !userCommentsThisSession.has(reply.id));
                          const firstTwoNonSession = nonSessionReplies.slice(0, 2);

                          // Combine and maintain chronological order (oldest first)
                          const visibleReplies = [...firstTwoNonSession, ...sessionReplies]
                            .sort((a, b) => {
                              const aTime = (a as any).created_at || a.timestamp;
                              const bTime = (b as any).created_at || b.timestamp;
                              return new Date(aTime).getTime() - new Date(bTime).getTime();
                            });

                          return visibleReplies;
                        })()).map((reply, idx) => renderComment(reply, true))}
                      </div>
                      {/* Show "X more replies" summary if there are more than 2 replies and not expanded */}
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
                            <span style={{ fontWeight: 600 }}>
                              {additionalRepliesCount} more {additionalRepliesCount === 1 ? 'reply' : 'replies'}
                            </span>
                            <span style={{ fontWeight: 400 }}>
                              {' • '}{formatTimeDifference(mostRecentTimestamp)}
                            </span>
                          </span>
                        </div>
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
