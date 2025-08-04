import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Avatar, message } from 'antd';
import { CommentThread } from '../comments/CommentThread';

import {
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  SendOutlined,
  PaperClipOutlined,
  LeftOutlined,
  InfoCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { getFileIcon } from '../../../utils/fileIconUtils';
import { ReactComponent as CalendarIcon } from '../../../img/calendar.svg';
import './PostPopup.css';
import { supabase } from '../../../supabaseClient';
import SendArrow from '../../../img/send-arrow.svg';
import MailIcon from '../../../img/mail.svg';
import BoardActivityStream from '../board/BoardActivityStream';

interface PostPopupProps {
  post: {
    id: string;
    title: string;
    content: string;
    author: {
      full_name: string;
      avatar_url: string;
      email: string;
    };
    created_at: string;
    color: string;
    board_id: string; // <-- add this
    reaction_counts?: {
      like: number;
    };
    attachments?: {
      id: string;
      storage_path: string;
      file_name: string;
      file_type: string;
      file_size: number;
    }[];
  };
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onPostLikeChange: (postId: string) => void;
  boardCreatorId?: string;
  isBoardOwner?: boolean;
}

interface Attachment {
  id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  // ...other fields
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
  attachments?: Attachment[];
}

interface FilePreview extends File {
  preview?: string;
}

async function uploadCommentAttachment(file: File, commentId: string, authorId: string) {
  // Log commentId value and type
  console.log('Uploading attachment for commentId:', commentId, 'Type:', typeof commentId);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("parentId", commentId);
  formData.append("parentType", "comment");

  const res = await fetch("https://prysm-r2-worker.prysmapp.workers.dev/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('R2 upload failed:', text);
    throw new Error("Failed to upload file to R2: " + text);
  }

  const { storage_path } = await res.json();

  const { error } = await supabase.from('attachments').insert([{
    storage_path,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    parent_type: 'comment',
    parent_id: commentId,
    author_id: authorId,
  }]);

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error("Failed to insert attachment into database: " + error.message);
  }

  return storage_path;
}

export function PostPopup({ post, isOpen, onClose, currentUser, onPostLikeChange, boardCreatorId, isBoardOwner }: PostPopupProps) {
  const [liked, setLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [fileList, setFileList] = useState<FilePreview[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const mobileCommentInputRef = useRef<HTMLTextAreaElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const postContentRef = useRef<HTMLDivElement>(null);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

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

  // Keep likeCount and liked in sync with post prop and backend
  useEffect(() => {
    // Fetch whether the current user has liked this post
    const fetchLiked = async () => {
      if (!currentUser) {
        setLiked(false);
        return;
      }
      const { data, error } = await supabase
        .from('reactions')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id)
        .eq('reaction_type', 'like');
      setLiked(!error && data && data.length > 0);
    };
    fetchLiked();
  }, [post.id, currentUser]);

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

      // Refetch the latest like count and liked state from backend to stay in sync
      const [{ data: postData, error: postError }, { data: likedData, error: likedError }] = await Promise.all([
        supabase
          .from('posts')
          .select('reaction_counts')
          .eq('id', post.id)
          .single(),
        supabase
          .from('reactions')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', currentUser.id)
          .eq('reaction_type', 'like')
      ]);
      if (!postError && postData) {
        onPostLikeChange(post.id);
      }
      setLiked(!likedError && Array.isArray(likedData) && likedData.length > 0);
    } catch (error) {
      console.error('Error handling reaction:', error);
      // Revert optimistic UI update on error
      setLiked(liked);
      message.error('Failed to update like status');
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!currentUser) {
      message.info('Please sign in to like comments');
      return;
    }

    // Find the comment in state
    const comment = comments.find(c => c.id === commentId) ||
      comments.flatMap(c => c.replies || []).find(r => r.id === commentId);

    if (!comment) return;

    const isLiked = comment.liked;

    // Optimistically update UI
    setComments(prevComments =>
      prevComments.map(c => {
        if (c.id === commentId) {
          return { ...c, liked: !isLiked, likes: c.likes + (isLiked ? -1 : 1) };
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r =>
              r.id === commentId
                ? { ...r, liked: !isLiked, likes: r.likes + (isLiked ? -1 : 1) }
                : r
            ),
          };
        }
        return c;
      })
    );

    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('comment_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('comment_id', commentId)
          .eq('user_id', currentUser.id)
          .eq('reaction_type', 'like');

        // Decrement like count in comments table
        const { data: commentData, error: commentError } = await supabase
          .from('comments')
          .select('reaction_counts')
          .eq('id', commentId)
          .single();

        if (commentError) throw commentError;
        const currentCount = commentData.reaction_counts?.like || 0;
        const newCount = Math.max(0, currentCount - 1);

        await supabase
          .from('comments')
          .update({
            reaction_counts: { ...commentData.reaction_counts, like: newCount }
          })
          .eq('id', commentId);
      } else {
        // Add like
        await supabase
          .from('comment_reactions')
          .insert([{
            post_id: post.id,
            comment_id: commentId,
            user_id: currentUser.id,
            reaction_type: 'like'
          }]);

        // Increment like count in comments table
        const { data: commentData, error: commentError } = await supabase
          .from('comments')
          .select('reaction_counts')
          .eq('id', commentId)
          .single();

        if (commentError) throw commentError;
        const currentCount = commentData.reaction_counts?.like || 0;
        const newCount = currentCount + 1;

        await supabase
          .from('comments')
          .update({
            reaction_counts: { ...commentData.reaction_counts, like: newCount }
          })
          .eq('id', commentId);
      }
    } catch (error) {
      // Revert optimistic update on error
      setComments(prevComments =>
        prevComments.map(c => {
          if (c.id === commentId) {
            return { ...c, liked: isLiked, likes: c.likes + (isLiked ? 1 : -1) };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r =>
                r.id === commentId
                  ? { ...r, liked: isLiked, likes: r.likes + (isLiked ? 1 : -1) }
                  : r
              ),
            };
          }
          return c;
        })
      );
      message.error('Failed to update like status');
    }
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

  const handleAddReply = async (parentId: number, reply: Comment) => {
    // Insert reply into Supabase with parent_comment_id
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        post_id: post.id,
        author_id: currentUser.id,
        content: reply.content,
        is_anonymous: false, // or true if you support anonymous
        created_at: new Date().toISOString(),
        parent_comment_id: parentId,
      }])
      .select();

    if (error) {
      message.error('Failed to post reply');
      return;
    }

    // Optionally, fetch comments again to refresh the thread
    fetchComments();
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
        if (totalSize > 25 * 1024 * 1024) {
          message.error('Total file size should not exceed 25MB');
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
      // 1. Insert comment into Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          post_id: post.id,
          author_id: currentUser.id,
          content: commentText,
          is_anonymous: false, // or true if you support anonymous
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) {
        message.error('Failed to post comment');
        return;
      }

      const commentId = data[0].id;

      // 2. Upload each attachment with the correct commentId and collect attachment data
      const uploadedAttachments: Attachment[] = [];
      try {
        for (const file of fileList) {
          const storage_path = await uploadCommentAttachment(file, commentId, currentUser.id);
          // Create attachment object to include in the local comment
          uploadedAttachments.push({
            id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID for display
            storage_path,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          });
        }
      } catch (err) {
        console.error('Attachment upload error:', err);
        message.error('Failed to upload one or more attachments');
      }

      // 3. Optionally, fetch the new comment from data[0] and add to state
      setComments([{
        id: commentId,
        author: {
          name: currentUser?.user_metadata?.full_name || 'Current User',
          avatar: currentUser?.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?img=1',
        },
        content: commentText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        likes: 0,
        liked: false,
        attachments: uploadedAttachments, // Include the uploaded attachments
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

  // Refactor fetchComments to nest replies
  const fetchComments = async () => {
    // Fetch all comments for the post
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`*, author:users(full_name, avatar_url), reaction_counts`)
      .eq('post_id', post.id)
      .order('created_at', { ascending: false });

    // Fetch attachments for all comments
    let attachmentsData: any[] = [];
    if (commentsData && commentsData.length > 0) {
      const commentIds = commentsData.map((comment: any) => comment.id);
      const { data: attachments, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .eq('parent_type', 'comment')
        .in('parent_id', commentIds);

      if (!attachmentsError && attachments) {
        attachmentsData = attachments;
      }
    }

    // Fetch all comment_reactions for this post by the current user
    let userReactions: any[] = [];
    if (currentUser) {
      const { data: reactionsData } = await supabase
        .from('comment_reactions')
        .select('comment_id, reaction_type')
        .eq('post_id', post.id)
        .eq('user_id', currentUser.id);
      userReactions = reactionsData || [];
    }

    if (!commentsError && commentsData) {
      // Separate top-level comments and replies
      const topLevel = commentsData.filter((c: any) => !c.parent_comment_id);
      const replies = commentsData.filter((c: any) => c.parent_comment_id);

      // Helper to format timestamp
      const formatTimestamp = (created_at: string) => {
        const date = new Date(created_at);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        return `${month} ${day}${getOrdinalSuffix(day)}, ${year} at ${time}`;
      };

      // Build a map for quick lookup
      const commentMap: { [key: number]: any } = {};
      topLevel.forEach((c: any) => {
        // Find attachments for this comment
        const commentAttachments = attachmentsData.filter(att => att.parent_id === c.id);

        commentMap[c.id] = {
          id: c.id,
          author: {
            name: c.author.full_name,
            avatar: c.author.avatar_url,
          },
          content: c.content,
          timestamp: formatTimestamp(c.created_at),
          likes: c.reaction_counts?.like || 0,
          liked: !!userReactions.some(r => r.comment_id === c.id && r.reaction_type === 'like'),
          replies: [],
          attachments: commentAttachments,
        };
      });
      // Attach replies to their parent
      replies.forEach((c: any) => {
        const parent = commentMap[c.parent_comment_id];
        if (parent) {
          // Find attachments for this reply
          const replyAttachments = attachmentsData.filter(att => att.parent_id === c.id);

          parent.replies.push({
            id: c.id,
            author: {
              name: c.author.full_name,
              avatar: c.author.avatar_url,
            },
            content: c.content,
            timestamp: formatTimestamp(c.created_at),
            likes: c.reaction_counts?.like || 0,
            liked: !!userReactions.some(r => r.comment_id === c.id && r.reaction_type === 'like'),
            attachments: replyAttachments,
          });
        }
      });
      // Set state with nested comments
      setComments(Object.values(commentMap));
      setCommentCount(commentsData.length);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, post.id]);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const modalWrap = document.querySelector('.ant-modal-wrap');
    if (!modalWrap) return;

    const handleScroll = () => {
      if (!postContentRef.current) return;
      const contentBottom = postContentRef.current.getBoundingClientRect().bottom;
      const navbarHeight = 60; // px
      setShowStickyHeader(contentBottom < navbarHeight + 8); // 8px buffer
    };

    modalWrap.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => modalWrap.removeEventListener('scroll', handleScroll);
  }, [isMobile, isOpen]);

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
          <div className="mobile-navbar-info" onClick={() => setShowMobileInfo(true)}>
            <InfoCircleOutlined />
          </div>
        </div>
      )}

      <div className={`mobile-sticky-header${showStickyHeader ? ' sticky-visible' : ''}`}>
        <div className="sticky-title">{post.title}</div>
        <div className="sticky-meta">
          <span className="sticky-likes">{post.reaction_counts?.like || 0} likes</span>
          <span className="sticky-comments">{commentCount} comments</span>
        </div>
      </div>

      <div
        ref={isMobile ? popupContainerRef : undefined}
        className={`post-popup-container ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}
        style={isMobile ? { paddingBottom: 80 } : {}} // add bottom padding for fixed bar
      >
        {!isMobile ? (
          <>
            <div className="left-column">
              <div className="post-content-section">
                <div className="post-header">
                  <h2 className="post-title">{post.title}</h2>
                  <div className="post-content">
                    <p>{post.content}</p>

                    {/* Display post attachments if any */}
                    {post.attachments && post.attachments.length > 0 && (
                      <div className="post-attachments">
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

                          post.attachments.forEach((attachment, originalIndex) => {
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
                                <div className="post-images-container">
                                  {images.map((attachment) => (
                                    <div key={attachment.id} className="post-attachment-preview">
                                      <div 
                                        className="post-attachment-image-container"
                                        onClick={() => window.open(`https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`, '_blank')}
                                        style={{ cursor: 'pointer' }}
                                        title={`Click to open ${attachment.file_name}`}
                                      >
                                        <img
                                          src={`https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`}
                                          alt={attachment.file_name}
                                          className="post-attachment-image"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Non-image files container */}
                              {nonImages.length > 0 && (
                                <div className="post-files-container">
                                  {nonImages.map((attachment) => (
                                    <div key={attachment.id} className="post-attachment-preview">
                                      <div 
                                        className="post-attachment-file-preview"
                                        onClick={() => window.open(`https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`, '_blank')}
                                        style={{ cursor: 'pointer' }}
                                        title={`Click to open ${attachment.file_name}`}
                                      >
                                        <>
                                          {getFileIcon(attachment.file_type, attachment.file_name)}
                                          <span className="attachment-file-name" title={attachment.file_name}>
                                            {attachment.file_name}
                                          </span>
                                        </>
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
                  </div>

                  <div className="post-actions">
                    <Button
                      className={`custom-like-button ${liked ? 'liked' : ''}`}
                      icon={liked ? <HeartFilled /> : <HeartOutlined />}
                      onClick={handleLike}
                    >
                      <span className="like-count">{post.reaction_counts?.like || 0}</span>
                    </Button>

                    <Button className="custom-comment-button" icon={<MessageOutlined />}>
                      <span className="comment-count">{commentCount}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="post-comment-divider"></div>

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
                        <div className="comment-file-preview-container">
                          {fileList.map((file, index) => (
                            <div key={index} className="comment-file-preview-wrapper">
                              <div className="file-preview-item">
                                <>
                                  {getFileIcon(file.type, file.name)}
                                  <span className="file-name">{file.name}</span>
                                </>
                                <button
                                  className="remove-file"
                                  onClick={() => removeFile(file)}
                                  title="Remove file"
                                >
                                  <CloseOutlined />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="input-buttons">
                        <div className="action-buttons-group">
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
                            <img src={SendArrow} alt="Send" className="send-arrow-icon" />
                          </button>
                        </div>
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

            {/* New vertical divider */}
            <div className="vertical-divider"></div>

            <div className="right-column">
              <div className="post-activity-section">
                <div className="about-section">
                  <h3>About</h3>
                  <div className="author-info">
                    <Avatar
                      src={post.author.avatar_url}
                      className="author-avatar"
                    />
                    <span className="author-name">{post.author.full_name}</span>
                  </div>
                  {isBoardOwner && (
                    <div className="author-email" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={MailIcon} alt="mail" className="mail-icon" />
                      <span>{post.author.email}</span>
                    </div>
                  )}
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
                  <BoardActivityStream 
                    boardId={post.board_id} 
                    currentUserId={currentUser?.id}
                    boardCreatorId={boardCreatorId}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mobile-post-header">
              <Avatar
                src={post.author.avatar_url}
                className="author-avatar"
              />
              <span className="author-name">{post.author.full_name}</span>
              <span className="post-time">
                {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="post-content-section" ref={postContentRef}>
              <div className="post-header">
                <h2 className="post-title">{post.title}</h2>
                <div className="post-content">
                  <p>{post.content}</p>

                  {/* Display post attachments if any - Mobile */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="post-attachments">
                      {(() => {
                        // Separate attachments by type while maintaining original order within each group
                        type AttachmentWithIndex = Attachment & {
                          originalIndex: number;
                        };
                        const images: AttachmentWithIndex[] = [];
                        const nonImages: AttachmentWithIndex[] = [];

                        post.attachments.forEach((attachment, originalIndex) => {
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
                              <div className="post-images-container">
                                {images.map((attachment) => (
                                  <div key={attachment.id} className="post-attachment-preview">
                                    <div 
                                      className="post-attachment-image-container"
                                      onClick={() => window.open(`https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`, '_blank')}
                                      style={{ cursor: 'pointer' }}
                                      title={`Click to open ${attachment.file_name}`}
                                    >
                                      <img
                                        src={`https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`}
                                        alt={attachment.file_name}
                                        className="post-attachment-image"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Non-image files container */}
                            {nonImages.length > 0 && (
                              <div className="post-files-container">
                                {nonImages.map((attachment) => (
                                  <div key={attachment.id} className="post-attachment-preview">
                                    <div 
                                      className="post-attachment-file-preview"
                                      onClick={() => window.open(`https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`, '_blank')}
                                      style={{ cursor: 'pointer' }}
                                      title={`Click to open ${attachment.file_name}`}
                                    >
                                      <>
                                        {getFileIcon(attachment.file_type, attachment.file_name)}
                                        <span className="attachment-file-name" title={attachment.file_name}>
                                          {attachment.file_name}
                                        </span>
                                      </>
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
                </div>
                <div className="post-actions">
                  <Button
                    className={`custom-like-button ${liked ? 'liked' : ''}`}
                    icon={liked ? <HeartFilled /> : <HeartOutlined />}
                    onClick={handleLike}
                  >
                    <span className="like-count">{post.reaction_counts?.like || 0}</span>
                  </Button>
                  <Button className="custom-comment-button" icon={<MessageOutlined />}>
                    <span className="comment-count">{commentCount}</span>
                  </Button>
                </div>
                {/* Divider */}
                <div className="post-comment-divider"></div>
              </div>
            </div>
            {/* Comments Section */}
            <div className="comments-section-container">
              <div className="comments-section">
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
            {/* Fixed mobile comment bar */}
            <div className="mobile-comment-bar">
              <div className="input-with-buttons mobile-input-row">
                {fileList.length > 0 && (
                  <div className="comment-file-preview-container mobile-preview">
                    {fileList.map((file, index) => (
                      <div key={index} className="comment-file-preview-wrapper">
                        <div className="file-preview-item">
                          <>
                            {getFileIcon(file.type, file.name)}
                            <span className="file-name">{file.name}</span>
                          </>
                          <button
                            className="remove-file"
                            onClick={() => removeFile(file)}
                            title="Remove file"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="comment-action-button"
                  onClick={handleFileAttachment}
                  title="Attach files"
                  type="button"
                >
                  <PaperClipOutlined />
                </button>
                <textarea
                  ref={mobileCommentInputRef}
                  placeholder="Join the conversation"
                  className="comment-input"
                  value={commentText}
                  onChange={handleCommentChange}
                  rows={1}
                />
                <button
                  className="comment-action-button send"
                  onClick={handleCommentSubmit}
                  title="Send comment"
                  type="button"
                >
                  <img src={SendArrow} alt="Send" className="send-arrow-icon" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isMobile && showMobileInfo && (
        <div className="mobile-info-panel">
          <button className="mobile-info-close" onClick={() => setShowMobileInfo(false)}>
            <CloseOutlined />
          </button>
          <div className="about-section">
            <h3>About</h3>
            <div className="author-info">
              <Avatar
                src={post.author.avatar_url}
                className="author-avatar"
              />
              <span className="author-name">{post.author.full_name}</span>
            </div>
            {isBoardOwner && (
              <div className="author-email" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={MailIcon} alt="mail" className="mail-icon" />
                <span>{post.author.email}</span>
              </div>
            )}
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
        </div>
      )}
    </Modal>
  );
} 