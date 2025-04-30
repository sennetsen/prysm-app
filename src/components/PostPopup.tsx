import React, { useState, useEffect } from 'react';
import { Modal, Button, Avatar, Tooltip, message } from 'antd';
import { CommentThread } from './CommentThread';
import { ActivityBar } from './ActivityBar';
import {
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  SendOutlined,
  PaperClipOutlined,
  LeftOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { ReactComponent as CalendarIcon } from '../img/calendar.svg';
import '../styles/PostPopup.css';
import { supabase } from '../supabaseClient';

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
    likesCount?: number;
    reactions?: Array<{ reaction_type: string; user_id: string }>;
  };
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onLikeUpdate?: (postId: string, newLikeCount: number, isLiked: boolean) => void;
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

export function PostPopup({ post, isOpen, onClose, currentUser, onLikeUpdate }: PostPopupProps) {
  const [liked, setLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(post.likesCount || 0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [fileList, setFileList] = useState<File[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Update liked state and like count when post changes
  useEffect(() => {
    if (post && currentUser) {
      // Check if the current user has liked this post
      const hasLiked = post.reactions?.some((r: { user_id: string; reaction_type: string }) => 
        r.user_id === currentUser.id && 
        r.reaction_type === 'like'
      ) || false;
      
      setLiked(hasLiked);
      setLikeCount(post.likesCount || 0);
    }
  }, [post, currentUser]);

  // Fetch latest post data and comments when component mounts
  useEffect(() => {
    const fetchPostData = async () => {
      if (!post.id) return;
      
      try {
        // Fetch post data
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            reactions(reaction_type, user_id)
          `)
          .eq('id', post.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          const hasLiked = currentUser && data.reactions?.some((r: { user_id: string; reaction_type: string }) => 
            r.user_id === currentUser.id && 
            r.reaction_type === 'like'
          ) || false;
          
          setLiked(hasLiked);
          setLikeCount(data.reaction_counts?.like || 0);
        }

        // Fetch comments for this post
        fetchComments();
      } catch (error) {
        console.error('Error fetching post data:', error);
      }
    };
    
    const fetchComments = async () => {
      try {
        // Fetch comments for this post
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            reaction_counts,
            author_id,
            author:users!author_id(id, full_name, avatar_url),
            reactions(user_id, reaction_type)
          `)
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });
        
        if (commentsError) throw commentsError;

        if (commentsData && commentsData.length > 0) {
          // Transform the comment data to match the Comment interface
          const formattedComments = commentsData.map(comment => {
            const likesCount = comment.reaction_counts?.like || 0;
            const userLiked = currentUser && comment.reactions?.some(
              (r: any) => r.user_id === currentUser.id && r.reaction_type === 'like'
            ) || false;
            
            // Extract author data safely
            // Access the first element if author is an array, otherwise treat as object
            const authorData = Array.isArray(comment.author) ? comment.author[0] : comment.author;
            const authorName = authorData?.full_name || 'Anonymous';
            const authorAvatar = authorData?.avatar_url || 'https://i.pravatar.cc/150?img=1';

            return {
              id: comment.id,
              author: {
                name: authorName,
                avatar: authorAvatar,
              },
              content: comment.content,
              timestamp: new Date(comment.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              likes: likesCount,
              liked: userLiked,
              // Eventually load replies here
              replies: []
            };
          });

          setComments(formattedComments);
          setCommentCount(formattedComments.length);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };
    
    fetchPostData();

    // Subscribe to realtime comment updates
    const channel = supabase
      .channel(`comments-${post.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comments',
        filter: `post_id=eq.${post.id}`
      }, () => {
        // Refresh comments when there's any change
        fetchComments();
      })
      .subscribe();

    return () => {
      // Clean up subscription
      supabase.removeChannel(channel);
    };
  }, [post.id, currentUser?.id]);

  // Add resize listener to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUser) {
      message.info('Please sign in to like posts');
      return;
    }

    try {
      const isCurrentlyLiked = liked;
      
      // Optimistically update UI
      setLiked(!isCurrentlyLiked);
      const newLikeCount = isCurrentlyLiked ? likeCount - 1 : likeCount + 1;
      setLikeCount(newLikeCount);
      
      // Update in the backend
      const { data: currentReactions, error: fetchError } = await supabase
        .from('reactions')
        .select()
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id)
        .eq('reaction_type', 'like');

      if (fetchError) throw fetchError;

      if (currentReactions && currentReactions.length > 0) {
        // If like exists, delete it
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('id', currentReactions[0].id);

        if (deleteError) throw deleteError;

        // Decrement like count in reaction_counts
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('reaction_counts')
          .eq('id', post.id)
          .single();

        if (postError) throw postError;
        if (postData) {
          const currentCount = postData.reaction_counts?.like || 0;
          const newCount = Math.max(0, currentCount - 1);

          await supabase
            .from('posts')
            .update({
              reaction_counts: { ...postData.reaction_counts, like: newCount }
            })
            .eq('id', post.id);
        }
      } else {
        // If no like exists, create it
        const { error: insertError } = await supabase
          .from('reactions')
          .insert([{
            post_id: post.id,
            user_id: currentUser.id,
            reaction_type: 'like'
          }]);

        if (insertError) throw insertError;

        // Increment like count in reaction_counts
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('reaction_counts')
          .eq('id', post.id)
          .single();

        if (postError) throw postError;
        if (postData) {
          const currentCount = postData.reaction_counts?.like || 0;
          const newCount = currentCount + 1;

          await supabase
            .from('posts')
            .update({
              reaction_counts: { ...postData.reaction_counts, like: newCount }
            })
            .eq('id', post.id);
        }
      }

      // Notify parent component if callback exists
      if (onLikeUpdate) {
        onLikeUpdate(post.id, newLikeCount, !isCurrentlyLiked);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      // Revert optimistic UI update on error
      setLiked(liked);
      setLikeCount(likeCount);
      message.error('Failed to update like status');
    }
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
    // Create an input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;

    // When files are selected
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        // Get the selected files
        const files = Array.from(target.files);

        // Check file size (example: limit to 5MB total)
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        if (totalSize > 5 * 1024 * 1024) {
          message.error('Total file size should not exceed 5MB');
          return;
        }

        // Add files to state
        setFileList([...fileList, ...files]);
        message.success(`${files.length} file(s) attached`);
      }
    };

    // Trigger the file input click
    fileInput.click();
  };

  const handleCommentSubmit = async () => {
    if (commentText.trim() || fileList.length > 0) {
      if (!currentUser) {
        message.info('Please sign in to comment');
        return;
      }

      try {
        // Save the comment to the database
        const { error } = await supabase
          .from('comments')
          .insert({
            post_id: post.id,
            content: commentText.trim(),
            author_id: currentUser.id,
            reaction_counts: {},
          });

        if (error) throw error;

        // Clear the input field and file list
        setCommentText('');
        setFileList([]);

        // Comments will be updated via the subscription
      } catch (error) {
        console.error('Error submitting comment:', error);
        message.error('Failed to submit comment');
      }
    }
  };

  const handleSubscribe = () => {
    setIsSubscribed(true);
    message.success('You have subscribed to this post!');
    // In a real app, you would send a request to your backend here
  };

  const handleUnsubscribe = () => {
    setIsSubscribed(false);
    message.info('You have unsubscribed from this post');
    // In a real app, you would send a request to your backend here
  };

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
        {/* Use conditional rendering to create different layouts for desktop */}
        {!isMobile ? (
          // Desktop-specific layout
          <div className="desktop-content-wrapper">
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
                    <div className="comment-input-wrapper">
                      <div className="input-with-buttons">
                        <input
                          type="text"
                          placeholder="Leave a comment..."
                          className="comment-input"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                        />
                        <div className="input-buttons">
                          <Button
                            className="comment-view-email-button"
                            icon={<MailOutlined />}
                            title="View email"
                          />
                          <Button
                            className="comment-export-emails-button"
                            icon={<ExportOutlined />}
                            title="Export emails"
                          />
                          <Button
                            className="comment-attach-button"
                            icon={<PaperClipOutlined />}
                            onClick={handleFileAttachment}
                            title="Attach files"
                          />
                          <Button
                            className="comment-submit-button"
                            icon={<SendOutlined />}
                            onClick={handleCommentSubmit}
                            title="Send comment"
                          />
                        </div>
                      </div>
                    </div>
                    {fileList.length > 0 && (
                      <div className="attached-files">
                        <div className="file-count">{fileList.length} file(s) attached</div>
                        <Button
                          className="clear-files-button"
                          onClick={() => setFileList([])}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
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
                    <CalendarIcon style={{ width: '18px', height: '18px', marginRight: '18px' }} />
                    <div className="date-time">
                      <div>{new Date(post.created_at).toLocaleDateString()}</div>
                      <div className="post-time">{new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                  </div>
                </div>

                <div className="subscribers-section">
                  <h3>Subscribers</h3>
                  <div className="avatar-group">
                    <Avatar.Group
                      maxCount={4}
                      maxStyle={{ color: '#281010', backgroundColor: '#f5f5f5' }}
                    >
                      <Avatar src="https://i.pravatar.cc/150?img=1" />
                      <Avatar src="https://i.pravatar.cc/150?img=2" />
                      <Avatar src="https://i.pravatar.cc/150?img=3" />
                      <Avatar src="https://i.pravatar.cc/150?img=4" />
                      <Avatar src="https://i.pravatar.cc/150?img=5" />
                    </Avatar.Group>
                    {isSubscribed ? (
                      <Button 
                        className="unsubscribe-button" 
                        onClick={handleUnsubscribe}
                      >
                        Unsubscribe
                      </Button>
                    ) : (
                      <Button 
                        className="subscribe-button" 
                        onClick={handleSubscribe}
                      >
                        Subscribe
                      </Button>
                    )}
                  </div>
                </div>

                <div className="activity-section">
                  <h3>Activity</h3>
                  <ActivityBar postId={post.id} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Mobile layout (unchanged)
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
                  <div className="comment-input-wrapper">
                    <div className="input-with-buttons">
                      <input
                        type="text"
                        placeholder="Leave a comment..."
                        className="comment-input"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                      />
                      <div className="input-buttons">
                        <Button
                          className="comment-view-email-button"
                          icon={<MailOutlined />}
                          title="View email"
                        />
                        <Button
                          className="comment-export-emails-button"
                          icon={<ExportOutlined />}
                          title="Export emails"
                        />
                        <Button
                          className="comment-attach-button"
                          icon={<PaperClipOutlined />}
                          onClick={handleFileAttachment}
                          title="Attach files"
                        />
                        <Button
                          className="comment-submit-button"
                          icon={<SendOutlined />}
                          onClick={handleCommentSubmit}
                          title="Send comment"
                        />
                      </div>
                    </div>
                  </div>
                  {fileList.length > 0 && (
                    <div className="attached-files">
                      <div className="file-count">{fileList.length} file(s) attached</div>
                      <Button
                        className="clear-files-button"
                        onClick={() => setFileList([])}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
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
                  <CalendarIcon style={{ width: '18px', height: '18px', marginRight: '18px' }} />
                  <div className="date-time">
                    <div>{new Date(post.created_at).toLocaleDateString()}</div>
                    <div className="post-time">{new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                </div>
              </div>

              <div className="subscribers-section">
                <h3>Subscribers</h3>
                <div className="avatar-group">
                  <Avatar.Group
                    maxCount={4}
                    maxStyle={{ color: '#281010', backgroundColor: '#f5f5f5' }}
                  >
                    <Avatar src="https://i.pravatar.cc/150?img=1" />
                    <Avatar src="https://i.pravatar.cc/150?img=2" />
                    <Avatar src="https://i.pravatar.cc/150?img=3" />
                    <Avatar src="https://i.pravatar.cc/150?img=4" />
                    <Avatar src="https://i.pravatar.cc/150?img=5" />
                  </Avatar.Group>
                  {isSubscribed ? (
                    <Button 
                      className="unsubscribe-button" 
                      onClick={handleUnsubscribe}
                    >
                      Unsubscribe
                    </Button>
                  ) : (
                    <Button 
                      className="subscribe-button" 
                      onClick={handleSubscribe}
                    >
                      Subscribe
                    </Button>
                  )}
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