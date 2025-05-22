import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Avatar, message } from 'antd';
import { CommentThread } from '../comments/CommentThread';
import { ActivityBar } from './ActivityBar';
import {
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  SendOutlined,
  PaperClipOutlined,
  LeftOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  FileOutlined
} from '@ant-design/icons';
import { ReactComponent as CalendarIcon } from '../../../img/calendar.svg';
import './PostPopup.css';
import { supabase } from '../../../supabaseClient';

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
    color: string;
  };
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
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

interface FilePreview extends File {
  preview?: string;
}

export function PostPopup({ post, isOpen, onClose, currentUser }: PostPopupProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(35);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [fileList, setFileList] = useState<FilePreview[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Add resize listener to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add auto-growing functionality
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    adjustTextareaHeight(e.target);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  const handleCommentLike = (commentId: number) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          liked: !comment.liked,
          likes: comment.liked ? comment.likes - 1 : comment.likes + 1
        };
      }

      // Check for replies
      if (comment.replies) {
        const updatedReplies = comment.replies.map(reply => {
          if (reply.id === commentId) {
            return {
              ...reply,
              liked: !reply.liked,
              likes: reply.liked ? reply.likes - 1 : reply.likes + 1
            };
          }
          return reply;
        });

        // If any replies were updated, return the updated comment
        if (updatedReplies.some((reply, idx) => reply !== comment.replies![idx])) {
          return {
            ...comment,
            replies: updatedReplies
          };
        }
      }

      return comment;
    }));
  };

  const handleDeleteComment = (commentId: number) => {
    // Check if it's a top-level comment
    const isTopLevelComment = comments.some(c => c.id === commentId);

    if (isTopLevelComment) {
      // Delete the top-level comment
      setComments(currentComments =>
        currentComments.filter(comment => comment.id !== commentId)
      );
    } else {
      // It must be a reply - look through all comments to find and remove the reply
      setComments(currentComments =>
        currentComments.map(comment => {
          // If the comment has replies, check if the reply needs to be deleted
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

    // Update the comment count
    setCommentCount(prev => prev - 1);
  };

  const handleAddReply = (parentId: number, reply: Comment) => {
    // Update the comments state to include the new reply
    setComments(currentComments =>
      currentComments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        }
        return comment;
      })
    );

    // Update the comment count since we added a reply
    setCommentCount(prev => prev + 1);
  };

  const handleFileAttachment = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt'; // Add accepted file types

    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const files = Array.from(target.files) as FilePreview[];

        // Check file size
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        if (totalSize > 5 * 1024 * 1024) {
          message.error('Total file size should not exceed 5MB');
          return;
        }

        // Create previews for images
        files.forEach(file => {
          if (file.type.startsWith('image/')) {
            file.preview = URL.createObjectURL(file);
          }
        });

        setFileList([...fileList, ...files]);
        message.success(`${files.length} file(s) attached`);
      }
    };

    fileInput.click();
  };

  const removeFile = (fileToRemove: FilePreview) => {
    setFileList(fileList.filter(file => file !== fileToRemove));
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      fileList.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  const handleCommentSubmit = async () => {
    if (commentText.trim() || fileList.length > 0) {
      // Insert comment into Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          post_id: post.id,
          author_id: currentUser.id,
          content: commentText,
          is_anonymous: false, // or true if you support anonymous
          created_at: new Date().toISOString(),
          // Add other fields as needed
        }])
        .select();

      if (error) {
        message.error('Failed to post comment');
        return;
      }

      // Optionally, fetch the new comment from data[0] and add to state
      setComments([{
        id: data[0].id,
        author: {
          name: currentUser?.user_metadata?.full_name || 'Current User',
          avatar: currentUser?.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?img=1',
        },
        content: commentText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        likes: 0,
        liked: false,
      }, ...comments]);

      setCommentText('');
      setFileList([]);
      setCommentCount(commentCount + 1);
    }
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      message.info('Please sign in to subscribe to this post');
      return;
    }

    setIsSubscribeLoading(true);
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsSubscribed(true);
      message.success({
        content: 'Successfully subscribed to this post',
        style: {
          marginTop: '80px',
        },
      });
    } catch (error) {
      message.error({
        content: 'Failed to subscribe to the post. Please try again.',
        style: {
          marginTop: '80px',
        },
      });
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!currentUser) {
      message.info('Please sign in to manage your subscriptions');
      return;
    }

    Modal.confirm({
      title: 'Unsubscribe from this post?',
      content: 'You will no longer receive notifications for this post.',
      okText: 'Unsubscribe',
      cancelText: 'Cancel',
      okButtonProps: {
        danger: true,
        style: { backgroundColor: '#EF5959', borderColor: '#EF5959' }
      },
      onOk: async () => {
        setIsSubscribeLoading(true);
        try {
          // Simulate API call with timeout
          await new Promise(resolve => setTimeout(resolve, 500));

          setIsSubscribed(false);
          message.success({
            content: 'Successfully unsubscribed from this post',
            style: {
              marginTop: '80px',
            },
          });
        } catch (error) {
          message.error({
            content: 'Failed to unsubscribe from the post. Please try again.',
            style: {
              marginTop: '80px',
            },
          });
        } finally {
          setIsSubscribeLoading(false);
        }
      },
    });
  };

  // Update the subscribers section in both desktop and mobile layouts
  const SubscribeButton = () => (
    <Button
      className={isSubscribed ? "unsubscribe-button" : "subscribe-button"}
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      loading={isSubscribeLoading}
    >
      {isSubscribed ? "Unsubscribe" : "Subscribe"}
    </Button>
  );

  useEffect(() => {
    if (isOpen) {
      const fetchComments = async () => {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            author:users (
              full_name,
              avatar_url
            )
          `)
          .eq('post_id', post.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setComments(data.map(c => ({
            id: c.id,
            author: {
              name: c.author.full_name,
              avatar: c.author.avatar_url,
            },
            content: c.content,
            timestamp: (() => {
              const date = new Date(c.created_at);
              const month = date.toLocaleDateString('en-US', { month: 'long' });
              const day = date.getDate();
              const year = date.getFullYear();
              const time = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
              return `${month} ${day}${getOrdinalSuffix(day)}, ${year} at ${time}`;
            })(),
            likes: 0, // You can fetch likes if you have a reactions table
            liked: false,
          })));
          setCommentCount(data.length);
        }
      };
      fetchComments();
    }
  }, [isOpen, post.id]);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      maskClosable={false}
      mask={true}
      width={isMobile ? window.innerWidth - 50 : '97%'}
      className={`post-popup ${isMobile ? 'mobile' : 'desktop'}`}
      style={{
        top: isMobile ? '72px' : '70px',
        bottom: isMobile ? '64px' : 'auto',
        height: 'auto',
        maxHeight: isMobile ? '100vh' : '80vh',
        maxWidth: isMobile ? 'none' : '97vw'
      }}
      closeIcon={<span style={{ fontSize: '24px' }}>×</span>}
    >
      {/* Mobile Navbar - only show on mobile */}
      {isMobile && (
        <div className="mobile-navbar">
          <div className="mobile-navbar-back" onClick={onClose}>
            <LeftOutlined />
          </div>
          <div className="mobile-navbar-title">Board Name</div>
          <div className="mobile-navbar-info">
            <InfoCircleOutlined />
          </div>
        </div>
      )}

      <div className={`post-popup-container ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
        {!isMobile ? (
          <>
            <div className="left-column">
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
                </div>
              </div>

              <div className="post-comment-divider-wrapper">
                <div className="post-comment-divider"></div>
              </div>

              <div className="comments-section-container">
                <div className="comments-section">
                  <div className="comment-input-container">
                    <div className="input-with-buttons">
                      <textarea
                        ref={commentInputRef}
                        placeholder="Leave a comment..."
                        className="comment-input"
                        value={commentText}
                        onChange={handleCommentChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCommentSubmit();
                          }
                        }}
                        rows={1}
                      />
                      {fileList.length > 0 && (
                        <div className="file-preview-list">
                          {fileList.map((file, index) => (
                            <div key={index} className="file-preview-item">
                              <FileOutlined />
                              <span className="file-name">{file.name}</span>
                              <button
                                className="remove-file"
                                onClick={() => removeFile(file)}
                                title="Remove file"
                              >
                                <CloseOutlined />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="input-buttons">
                        <button
                          className="comment-action-button"
                          onClick={handleFileAttachment}
                          title="Attach files"
                        >
                          <PaperClipOutlined />
                        </button>
                        <button
                          className="comment-action-button send"
                          onClick={handleCommentSubmit}
                          title="Send comment"
                        >
                          <SendOutlined />
                        </button>
                      </div>
                    </div>
                  </div>

                  <CommentThread
                    postId={post.id}
                    currentUser={currentUser}
                    comments={comments}
                    onLike={handleCommentLike}
                    onAddReply={handleAddReply}
                    onDelete={handleDeleteComment}
                  />
                </div>
              </div>
            </div>

            <div className="right-column">
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
                    <CalendarIcon />
                    <div className="date-time">
                      <span>
                        {(() => {
                          const date = new Date(post.created_at);
                          const day = date.getDate();
                          const month = date.toLocaleDateString('en-US', { month: 'long' });
                          const year = date.getFullYear();
                          return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
                        })()}
                      </span>
                      <span className="post-time">
                        {new Date(post.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="subscribers-section">
                  <h3>Subscribers</h3>
                  <div className="avatar-group">
                    <Avatar.Group
                      maxCount={4}
                      maxStyle={{
                        color: '#281010',
                        backgroundColor: '#f5f5f5',
                        border: '2px solid #fff'
                      }}
                    >
                      <Avatar src="https://i.pravatar.cc/150?img=1" />
                      <Avatar src="https://i.pravatar.cc/150?img=2" />
                      <Avatar src="https://i.pravatar.cc/150?img=3" />
                      <Avatar src="https://i.pravatar.cc/150?img=4" />
                      <Avatar src="https://i.pravatar.cc/150?img=5" />
                    </Avatar.Group>
                    <SubscribeButton />
                  </div>
                </div>

                <div className="activity-section">
                  <h3>Activity</h3>
                  <ActivityBar postId={post.id} />
                </div>
              </div>
            </div>
          </>
        ) : (
          // Mobile layout remains unchanged
          <>
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
              </div>
            </div>

            <div className="post-comment-divider-wrapper">
              <div className="post-comment-divider"></div>
            </div>

            <div className="comments-section-container">
              <div className="comments-section">
                <div className="comment-input-container">
                  <div className="input-with-buttons">
                    <textarea
                      ref={commentInputRef}
                      placeholder="Leave a comment..."
                      className="comment-input"
                      value={commentText}
                      onChange={handleCommentChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit();
                        }
                      }}
                      rows={1}
                    />
                    {fileList.length > 0 && (
                      <div className="file-preview-list">
                        {fileList.map((file, index) => (
                          <div key={index} className="file-preview-item">
                            <FileOutlined />
                            <span className="file-name">{file.name}</span>
                            <button
                              className="remove-file"
                              onClick={() => removeFile(file)}
                              title="Remove file"
                            >
                              <CloseOutlined />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="input-buttons">
                      <button
                        className="comment-action-button"
                        onClick={handleFileAttachment}
                        title="Attach files"
                      >
                        <PaperClipOutlined />
                      </button>
                      <button
                        className="comment-action-button send"
                        onClick={handleCommentSubmit}
                        title="Send comment"
                      >
                        <SendOutlined />
                      </button>
                    </div>
                  </div>
                </div>

                <CommentThread
                  postId={post.id}
                  currentUser={currentUser}
                  comments={comments}
                  onLike={handleCommentLike}
                  onAddReply={handleAddReply}
                  onDelete={handleDeleteComment}
                />
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
                  <CalendarIcon />
                  <div className="date-time">
                    <span>
                      {(() => {
                        const date = new Date(post.created_at);
                        const day = date.getDate();
                        const month = date.toLocaleDateString('en-US', { month: 'long' });
                        const year = date.getFullYear();
                        return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
                      })()}
                    </span>
                    <span className="post-time">
                      {new Date(post.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="subscribers-section">
                <h3>Subscribers</h3>
                <div className="avatar-group">
                  <Avatar.Group
                    maxCount={4}
                    maxStyle={{
                      color: '#281010',
                      backgroundColor: '#f5f5f5',
                      border: '2px solid #fff'
                    }}
                  >
                    <Avatar src="https://i.pravatar.cc/150?img=1" />
                    <Avatar src="https://i.pravatar.cc/150?img=2" />
                    <Avatar src="https://i.pravatar.cc/150?img=3" />
                    <Avatar src="https://i.pravatar.cc/150?img=4" />
                    <Avatar src="https://i.pravatar.cc/150?img=5" />
                  </Avatar.Group>
                  <SubscribeButton />
                </div>
              </div>

              <div className="activity-section">
                <h3>Activity</h3>
                <ActivityBar postId={post.id} />
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
} 