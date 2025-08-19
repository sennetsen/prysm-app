import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, message } from 'antd';
import { Avatar } from '../../shared';
import { CommentThread } from '../comments/CommentThread';
import { notifyNewComment, notifyBoardCreatorActivity, NOTIFICATION_TYPES } from '../../../utils/notificationService';

import {
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  SendOutlined,
  PaperClipOutlined,
  LeftOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  FileOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  LoadingOutlined
} from '@ant-design/icons';
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
  boardEmail?: string;
  onRequireSignIn: () => void;
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
    avatar_url?: string;
    avatar_storage_path?: string;
    full_name?: string;
    id?: string;
  };
  content: string;
  timestamp: string;
  created_at?: string; // Add optional created_at for sorting
  likes: number;
  liked: boolean;
  replies?: Comment[];
  attachments?: Attachment[];
  files?: File[]; // Add optional files property for uploads
  is_deleted?: boolean;
  isNew?: boolean; // Flag for new comments added via real-time updates
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

async function deleteAttachmentFromR2(storagePath: string) {
  try {
    const response = await fetch(`https://prysm-r2-worker.prysmapp.workers.dev/delete/${storagePath}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete file from R2:', errorText);
      throw new Error(`Failed to delete file from R2: ${errorText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting attachment from R2:', error);
    throw error;
  }
}

async function deleteCommentAttachments(commentId: string) {
  try {
    // 1. FIRST: Fetch all attachments for this comment (before deleting from DB)
    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('parent_type', 'comment')
      .eq('parent_id', commentId);

    if (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }

    // 2. SECOND: Delete each attachment from R2 first
    for (const attachment of attachments || []) {
      try {
        // Delete from R2 BEFORE deleting from database
        await deleteAttachmentFromR2(attachment.storage_path);
      } catch (r2Error) {
        console.error('Error deleting from R2:', r2Error);
        // Continue with other attachments even if one fails
      }
    }

    // 3. THIRD: Delete from database after R2 cleanup
    if (attachments && attachments.length > 0) {
      const { error: deleteError } = await supabase
        .from('attachments')
        .delete()
        .eq('parent_type', 'comment')
        .eq('parent_id', commentId);

      if (deleteError) {
        console.error('Error deleting attachments from database:', deleteError);
      }
    }
  } catch (error) {
    console.error('Error in deleteCommentAttachments:', error);
    throw error;
  }
}

export function PostPopup({ post, isOpen, onClose, currentUser, onPostLikeChange, boardCreatorId, boardEmail, onRequireSignIn }: PostPopupProps) {
  const [liked, setLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [fileList, setFileList] = useState<FilePreview[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null); // Desktop comment input
  const mobileCommentInputRef = useRef<HTMLTextAreaElement>(null); // Mobile comment input  
  const commentTextRef = useRef<string>(''); // Track input value without re-renders
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const postContentRef = useRef<HTMLDivElement>(null);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [userCommentsThisSession, setUserCommentsThisSession] = useState<Set<number>>(new Set());
  const [isMobileInputExpanded, setIsMobileInputExpanded] = useState(false);
  const [isActionButtonClicked, setIsActionButtonClicked] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<string | null>(null); // Track which comment we're replying to
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [hasContent, setHasContent] = useState(false); // Track if user has typed content
  const [newCommentIds, setNewCommentIds] = useState<Set<number>>(new Set()); // Track new comments for animation

  // Initialize likeCount from post.likes or post.likesCount
  const [likeCount, setLikeCount] = useState(post.reaction_counts?.like ?? 0);

  // Handle mobile popup closing with animation
  const handleClose = () => {
    if (isMobile) {
      setIsClosing(true);
      // Wait for animation to complete before actually closing
      setTimeout(() => {
        setIsClosing(false);
        onClose();
      }, 180); // Match animation duration (180ms for exit)
    } else {
      onClose();
    }
  };

  // Handle attachment click to open in new tab
  const handleAttachmentClick = (attachment: Attachment, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent click handlers
    const attachmentUrl = `https://prysm-r2-worker.prysmapp.workers.dev/file/${attachment.storage_path}`;
    window.open(attachmentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    // Extract board url_path from current URL
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    const boardPath = pathParts[1]; // The board path is the first part after the domain
    const postUrl = `${window.location.origin}/${boardPath}/posts/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    message.success('Post link copied to clipboard!');
  };



  // Auto-expand when files are added/removed
  useEffect(() => {
    if (fileList.length > 0) {
      setIsMobileInputExpanded(true);
    }
  }, [fileList.length]);

  // Removed debug logging

  // Mobile comment submission restored

  // Keep likeCount in sync with post prop
  useEffect(() => {
    setLikeCount(post.reaction_counts?.like ?? 0);
  }, [post.reaction_counts?.like]);

  // Fetch subscription state when component mounts or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      fetchSubscriptionState();
    }
  }, [isOpen, currentUser?.id, post.id]);

  // Fetch subscribers when component mounts (for all users)
  useEffect(() => {
    if (isOpen && post.id) {
      console.log('Fetching subscribers for post:', post.id);
      fetchSubscribers();
    }
  }, [isOpen, post.id]);

  // Removed useEffect that was running on every commentText change

  // Handle viewport changes for keyboard behavior (Reddit-style)
  useEffect(() => {
    if (!isMobile) return;

    const handleViewportChange = () => {
      // Update viewport height
      const newHeight = window.innerHeight;
      setViewportHeight(newHeight);

      // Handle keyboard appearance/disappearance
      const heightDifference = window.screen.height - newHeight;
      const isKeyboardVisible = heightDifference > 150; // Threshold for keyboard detection

      // Disabled scrollIntoView as it was causing focus loss
      // if (isKeyboardVisible && isMobileInputExpanded) {
      //   setTimeout(() => {
      //     if (commentInputRef.current) {
      //       commentInputRef.current.scrollIntoView({
      //         behavior: 'smooth',
      //         block: 'center'
      //       });
      //     }
      //   }, 100);
      // }
    };

    // Listen for viewport changes
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    // Visual viewport API for better keyboard detection (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }



    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [isMobile, isMobileInputExpanded]);

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

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    commentTextRef.current = value;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce state update to minimize re-renders
    debounceTimerRef.current = setTimeout(() => {
      setCommentText(value);
    }, 100);

    adjustTextareaHeight(e.target);
  }, []);

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
      onRequireSignIn();
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

  const handleCommentLike = useCallback(async (commentId: number) => {
    if (!currentUser) {
      onRequireSignIn();
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

        // Send notification if board creator liked a comment
        try {
          const isBoardCreatorLike = currentUser.email === boardEmail;
          if (isBoardCreatorLike && boardEmail) {
            const currentPath = window.location.pathname;
            const pathParts = currentPath.split('/');
            const boardPath = pathParts[1];
            
            if (boardPath) {
              await notifyBoardCreatorActivity(
                post.id,
                NOTIFICATION_TYPES.BOARD_CREATOR_LIKE,
                {
                  commentId: commentId,
                  commentAuthorName: comment.author.name || comment.author.full_name || 'Unknown',
                  board_creator_id: currentUser.id
                },
                boardPath,
                post.title || 'Untitled Post',
                boardEmail
              );
            }
          }
        } catch (notificationError) {
          console.error('Error sending board creator like notification:', notificationError);
          // Don't fail the like operation if notifications fail
        }
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
  }, [currentUser, comments, onRequireSignIn, boardEmail]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    try {
      // Soft delete the comment
      const { error: updateError } = await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      if (updateError) {
        console.error('Error soft deleting comment:', updateError);
        message.error('Failed to delete comment');
        return;
      }

      // Cascade delete all attachments associated with the comment
      await deleteCommentAttachments(commentId.toString());

      // Delete all comment reactions for this comment
      const { error: reactionsError } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId);

      if (reactionsError) {
        console.error('Error deleting comment reactions:', reactionsError);
      }

      // Update local state to mark comment as deleted
      setComments(currentComments =>
        currentComments.map(comment => {
          if (comment.id === commentId) {
                      // Mark the top-level comment as deleted
          return {
            ...comment,
            is_deleted: true,
            content: '',
            author: { name: 'Deleted comment', avatar_url: '', avatar_storage_path: '' },
            likes: 0,
            liked: false,
            attachments: []
          };
          }
          // If it's a reply being deleted, check in replies
          if (comment.replies && comment.replies.some(reply => reply.id === commentId)) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply.id === commentId
                  ? {
                    ...reply,
                    is_deleted: true,
                    content: '',
                    author: { name: 'Deleted comment', avatar_url: '', avatar_storage_path: '' },
                    likes: 0,
                    liked: false,
                    attachments: []
                  }
                  : reply
              )
            };
          }
          return comment;
        })
      );

      message.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      message.error('Failed to delete comment');
    }
  }, []);

  // Unified function to create comments (top-level or replies) with attachments
  const createCommentWithAttachments = useCallback(async (
    commentData: {
      content: string;
      parentCommentId?: string | number;
      files: File[];
    }
  ) => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }

    try {
      // 1. Insert comment into Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          post_id: post.id,
          author_id: currentUser.id,
          content: commentData.content,
          is_anonymous: false,
          created_at: new Date().toISOString(),
          parent_comment_id: commentData.parentCommentId || null, // null for top-level, UUID for replies
        }])
        .select();

      if (error) {
        message.error('Failed to post comment');
        return;
      }

      const commentId = data[0].id;

      // Auto-subscribe the commenter to the post if they're not already subscribed
      try {
        // Check if user is already subscribed before attempting to subscribe
        const wasAlreadySubscribed = isSubscribed;
        
        // Skip upsert if already subscribed (performance optimization)
        if (wasAlreadySubscribed) {
          console.log('User already subscribed, skipping upsert');
        } else {
          const { error: subscribeError } = await supabase
            .from('subscriptions')
            .upsert([{
              user_id: currentUser.id,
              post_id: post.id
            }], {
              onConflict: 'user_id,post_id' // Use upsert to prevent duplicates
            });

          if (subscribeError) {
            console.warn('Failed to auto-subscribe commenter to post:', subscribeError);
            // Don't show error to user since this is automatic
          } else {
            console.log('Commenter automatically subscribed to post');
            message.success('Successfully subscribed to this post automatically');
            // Update local subscription state immediately
            setIsSubscribed(true);
            // Note: Subscribers list will be updated automatically via real-time subscription
          }
        }
      } catch (subscribeErr) {
        console.warn('Error auto-subscribing commenter to post:', subscribeErr);
        // Don't show error to user since this is automatic
      }

      // 2. Upload each attachment with the correct commentId and collect attachment data
      const uploadedAttachments: Attachment[] = [];
      if (commentData.files.length > 0) {
        setIsFileUploading(true);
        try {
          for (const file of commentData.files) {
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
        } finally {
          setIsFileUploading(false);
        }
      }

      // 3. Track this comment as created in this session
      const updatedSessionSet = new Set([...userCommentsThisSession, commentId]);
      setUserCommentsThisSession(updatedSessionSet);

      // 4. Refresh comments to get proper sorting with updated session data
      fetchComments(updatedSessionSet);

      // 5. Send email notifications to subscribers
      try {
        // Get board path for email links
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/');
        const boardPath = pathParts[1]; // Extract board path from URL
        
        // Ensure required values exist
        if (!boardPath) {
          console.warn('Could not extract board path for notifications');
          return { success: true, commentId, attachments: uploadedAttachments };
        }
        
        const postTitle = post.title || 'Untitled Post';
        
        // Check if this is a board creator comment
        const isBoardCreatorComment = currentUser.email === boardEmail;
        
        if (isBoardCreatorComment && boardEmail) {
          // Special notification for board creator comments
          await notifyBoardCreatorActivity(
            post.id,
            NOTIFICATION_TYPES.BOARD_CREATOR_COMMENT,
            {
              id: commentId,
              board_creator_id: currentUser.id,
              content: commentData.content
            },
            boardPath,
            postTitle,
            boardEmail
          );
        } else {
          // Regular comment notification
          await notifyNewComment(
            post.id,
            {
              id: commentId,
              author_id: currentUser.id,
              author_name: currentUser.user_metadata?.full_name || currentUser.email,
              content: commentData.content
            },
            boardPath,
            postTitle
          );
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the comment creation if notifications fail
      }

      return { success: true, commentId, attachments: uploadedAttachments };
    } catch (error) {
      console.error('Error creating comment:', error);
      message.error('Failed to post comment');
      return { success: false, error };
    }
  }, [post.id, currentUser, userCommentsThisSession, onRequireSignIn, isSubscribed]);

  const handleCommentSubmit = useCallback(async (internal = false) => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
    if (!internal && isSubmitting) return; // Prevent double submission

    // Use current text from ref if it's more recent than state
    const currentText = commentTextRef.current || commentText;
    if (!(currentText.trim() || fileList.length > 0)) return;

    if (!internal) setIsSubmitting(true);

    try {
      const result = await createCommentWithAttachments({
        content: currentText,
        files: fileList
      });

      if (result?.success) {
        // Clear both ref and state
        commentTextRef.current = '';
        setCommentText('');
        setHasContent(false);
        setFileList([]);

        // Clear the textarea value directly (desktop and mobile)
        if (commentInputRef.current) {
          commentInputRef.current.value = '';
        }
        if (mobileCommentInputRef.current) {
          mobileCommentInputRef.current.value = '';
        }

        // Collapse mobile input after posting
        if (isMobile) {
          setIsMobileInputExpanded(false);
        }

        // Show success notification
        if (!internal) {
          message.success('Comment submitted successfully!');
        }
      }
    } finally {
      if (!internal) setIsSubmitting(false);
    }
  }, [isSubmitting, commentText, fileList, createCommentWithAttachments, isMobile, onRequireSignIn]);

  const handleAddReply = useCallback(async (parentId: number | string, reply: Comment) => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }

    try {
      const result = await createCommentWithAttachments({
        content: reply.content,
        parentCommentId: parentId,
        files: reply.files || []
      });

      if (result?.success) {
        // Reply was created successfully, comments will be refreshed by createCommentWithAttachments
        console.log('Reply created successfully with ID:', result.commentId);
      }
    } catch (error) {
      console.error('Error creating reply:', error);
      message.error('Failed to post reply');
    }
  }, [createCommentWithAttachments, currentUser, onRequireSignIn]);

  const handleFileAttachment = () => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
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
        message.success(`${files.length} file${files.length === 1 ? '' : 's'} attached`);
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

  // Clean up object URLs and timers on unmount
  useEffect(() => {
    return () => {
      fileList.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });

      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Sync ref with state when state changes (for external updates)
  useEffect(() => {
    commentTextRef.current = commentText;
  }, [commentText]);

  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Helper function to format relative time (like "1 day ago")
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      return 'some time ago';
    }

    const diffMs = now.getTime() - date.getTime();
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

  // Fetch current subscription state
  const fetchSubscriptionState = async () => {
    if (!currentUser || !post.id) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('post_id', post.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching subscription state:', error);
        return;
      }

      setIsSubscribed(!!data);
      console.log('Subscription state fetched:', !!data);
    } catch (error) {
      console.error('Error fetching subscription state:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }

    setIsSubscribeLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: currentUser.id,
          post_id: post.id
        }]);

      if (error) {
        console.error('Error subscribing:', error);
        message.error('Failed to subscribe to the post. Please try again.');
        return;
      }

      setIsSubscribed(true);
      message.success('Successfully subscribed to this post');

      // Add current user to subscribers list if not already there
      if (currentUser) {
        setSubscribers(prev => {
          const userExists = prev.some(sub => sub.user.id === currentUser.id);
          if (!userExists) {
            return [{
              created_at: new Date().toISOString(),
              user: {
                id: currentUser.id,
                full_name: currentUser.user_metadata?.full_name || currentUser.email,
                email: currentUser.email,
                avatar_url: currentUser.user_metadata?.avatar_url || ''
              }
            }, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      message.error('Failed to subscribe to the post. Please try again.');
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!currentUser) {
      onRequireSignIn();
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
          const { error } = await supabase
            .from('subscriptions')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('post_id', post.id);

          if (error) {
            console.error('Error unsubscribing:', error);
            message.error('Failed to unsubscribe from the post. Please try again.');
            return;
          }

          setIsSubscribed(false);
          message.success('Successfully unsubscribed from this post');

          // Remove current user from subscribers list
          if (currentUser) {
            setSubscribers(prev => prev.filter(sub => sub.user.id !== currentUser.id));
          }
        } catch (error) {
          console.error('Error unsubscribing:', error);
          message.error('Failed to unsubscribe from the post. Please try again.');
        } finally {
          setIsSubscribeLoading(false);
        }
      },
    });
  };

  // Fetch subscribers for display and CSV export
  const fetchSubscribers = async () => {
    console.log('fetchSubscribers called for post:', post.id);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          created_at,
          user:users(
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });

      console.log('fetchSubscribers result:', { data, error });

      if (error) {
        console.error('Error fetching subscribers:', error);
        return;
      }

      setSubscribers(data || []);
      console.log('Subscribers set:', data || []);
      return data;
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    }
  };

  // Export subscribers as CSV
  const handleExportCSV = async () => {
    // Check if current user is the board creator
    if (currentUser?.email !== boardEmail) {
      message.error('Only the board creator can export subscribers');
      return;
    }

    setIsExportingCSV(true);
    try {
      const subscribersData = await fetchSubscribers();

      if (!subscribersData || subscribersData.length === 0) {
        message.warning('No subscribers to export');
        return;
      }

      // Create CSV content
      const csvHeaders = ['Subscriber Name', 'Email Address', 'Phone Number', 'Subscribed On'];
      const csvRows = subscribersData.map((sub: any) => [
        sub.user?.full_name || 'Unknown',
        sub.user?.email || '',
        '', // Phone number (not available in current schema)
        new Date(sub.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `subscribers-${post.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(`Exported ${subscribersData.length} subscriber${subscribersData.length === 1 ? '' : 's'} to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      message.error('Failed to export CSV');
    } finally {
      setIsExportingCSV(false);
    }
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

  // CSV Export Button - only visible to board creator
  const ExportCSVButton = () => {
    // Debug logging
    console.log('ExportCSVButton debug:', {
      currentUserId: currentUser?.id,
      currentUserEmail: currentUser?.email,
      boardCreatorId: boardCreatorId,
      boardEmail: boardEmail,
      isCreator: currentUser?.email === boardEmail,
      subscribersCount: subscribers.length
    });

    // Only show to board creator (check by email)
    if (currentUser?.email !== boardEmail) {
      console.log('ExportCSVButton: User is not board creator, hiding button');
      return null;
    }

    console.log('ExportCSVButton: User is board creator, showing button');
    return (
      <Button
        className="export-csv-button"
        icon={<DownloadOutlined style={{ fontWeight: 'bold' }} />}
        onClick={handleExportCSV}
        loading={isExportingCSV}
        title="Export subscribers as CSV"
      >
        Export Contacts
      </Button>
    );
  };

  // Refactor fetchComments to nest replies
  const fetchComments = async (updatedSessionSet?: Set<number>) => {
    // Use the updated session set if provided, otherwise use current state
    const currentSessionSet = updatedSessionSet || userCommentsThisSession;
    // Fetch all comments for the post
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`*, author:users(full_name, avatar_url, avatar_storage_path), reaction_counts`)
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
      // Separate top-level comments and replies (include deleted comments)
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
            name: c.is_deleted ? 'Deleted comment' : c.author.full_name,
            avatar_url: c.is_deleted ? '' : c.author.avatar_url,
            avatar_storage_path: c.is_deleted ? '' : c.author.avatar_storage_path,
          },
          content: c.is_deleted ? '' : c.content,
          timestamp: formatTimestamp(c.created_at),
          created_at: c.created_at, // Keep raw timestamp for sorting
          likes: c.is_deleted ? 0 : (c.reaction_counts?.like || 0),
          liked: c.is_deleted ? false : !!userReactions.some(r => r.comment_id === c.id && r.reaction_type === 'like'),
          replies: [],
          attachments: c.is_deleted ? [] : commentAttachments,
          is_deleted: c.is_deleted || false,
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
              name: c.is_deleted ? 'Deleted comment' : c.author.full_name,
              avatar_url: c.is_deleted ? '' : c.author.avatar_url,
              avatar_storage_path: c.is_deleted ? '' : c.author.avatar_storage_path,
            },
            content: c.is_deleted ? '' : c.content,
            timestamp: formatTimestamp(c.created_at),
            created_at: c.created_at, // Keep raw timestamp for sorting
            likes: c.is_deleted ? 0 : (c.reaction_counts?.like || 0),
            liked: c.is_deleted ? false : !!userReactions.some(r => r.comment_id === c.id && r.reaction_type === 'like'),
            attachments: c.is_deleted ? [] : replyAttachments,
            is_deleted: c.is_deleted || false,
          });
        }
      });
      // Sophisticated comment sorting
      const sortComments = (comments: any[]) => {
        return comments.sort((a, b) => {
          const aIsUserComment = currentUser && a.author.name === currentUser.user_metadata?.full_name;
          const bIsUserComment = currentUser && b.author.name === currentUser.user_metadata?.full_name;
          const aFromSession = currentSessionSet.has(a.id);
          const bFromSession = currentSessionSet.has(b.id);

          // Prioritize session comments at the very top
          if (aFromSession && !bFromSession) return -1;
          if (!aFromSession && bFromSession) return 1;

          // Both are from this session - sort by most recent first
          if (aFromSession && bFromSession) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }

          // Neither from session - use original sophisticated sorting
          // If both are user comments, sort by most liked first, then by creation time
          if (aIsUserComment && bIsUserComment) {
            if (a.likes !== b.likes) {
              return b.likes - a.likes; // Most liked first
            }
            // Same likes, maintain original order by creation time
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }

          // If only one is user comment, user comment goes to top
          if (aIsUserComment && !bIsUserComment) return -1;
          if (!aIsUserComment && bIsUserComment) return 1;

          // For non-user comments, sort by most liked
          return b.likes - a.likes;
        });
      };

      // Sort replies chronologically (oldest first) with session replies at top
      const sortReplies = (replies: any[]) => {
        return replies.sort((a, b) => {
          const aFromSession = currentSessionSet.has(a.id);
          const bFromSession = currentSessionSet.has(b.id);

          // Prioritize session replies at the very top
          if (aFromSession && !bFromSession) return -1;
          if (!aFromSession && bFromSession) return 1;

          // Both are from this session - sort by most recent first
          if (aFromSession && bFromSession) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }

          // Neither from session - use chronological order (oldest first)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
      };

      // Sort top-level comments with sophisticated logic
      const sortedComments = sortComments(Object.values(commentMap));

      // Sort replies within each comment chronologically
      sortedComments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies = sortReplies(comment.replies);
        }
      });

      // Set state with sorted nested comments
      setComments(sortedComments);
      setCommentCount(commentsData.length);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      fetchSubscriptionState(); // Fetch subscription state on open
    }
  }, [isOpen, post.id]);

  // Add real-time subscriptions for comments, comment reactions, and post subscriptions
  useEffect(() => {
    if (!isOpen || !post.id) return;

    // Subscribe to new comments for this post
    const commentChannel = supabase
      .channel(`post-comments:${post.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${post.id}`
      }, async (payload) => {
        const { new: comment } = payload;

        // Fetch author info and attachments
        const [{ data: user }, { data: attachments }] = await Promise.all([
          supabase
            .from('users')
            .select('full_name, avatar_url, avatar_storage_path')
            .eq('id', comment.author_id)
            .single(),
          supabase
            .from('attachments')
            .select('*')
            .eq('parent_type', 'comment')
            .eq('parent_id', comment.id)
        ]);

        // Format the new comment
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

        const newComment: Comment = {
          id: comment.id,
          author: {
            name: comment.is_deleted ? 'Deleted comment' : (user?.full_name || 'Unknown'),
            avatar_url: comment.is_deleted ? '' : (user?.avatar_url || ''),
            avatar_storage_path: comment.is_deleted ? '' : (user?.avatar_storage_path || ''),
          },
          content: comment.is_deleted ? '' : comment.content,
          timestamp: formatTimestamp(comment.created_at),
          created_at: comment.created_at,
          likes: comment.is_deleted ? 0 : (comment.reaction_counts?.like || 0),
          liked: false, // Will be updated when user reactions are fetched
          replies: [],
          attachments: comment.is_deleted ? [] : (attachments || []),
          is_deleted: comment.is_deleted || false,
          isNew: true, // Mark as new for animation
        };

        // Add to new comments set for animation
        setNewCommentIds(prev => new Set([...prev, comment.id]));

        // Add to session set if it's a new comment from current user
        if (currentUser && user?.full_name === currentUser.user_metadata?.full_name) {
          const updatedSessionSet = new Set([...userCommentsThisSession, comment.id]);
          setUserCommentsThisSession(updatedSessionSet);
        }

        // Update comments state
        setComments(prevComments => {
          if (comment.parent_comment_id) {
            // This is a reply - add it to the parent comment
            return prevComments.map(c => {
              if (c.id === comment.parent_comment_id) {
                return {
                  ...c,
                  replies: [...(c.replies || []), newComment]
                };
              }
              return c;
            });
          } else {
            // This is a top-level comment - add it to the beginning
            return [newComment, ...prevComments];
          }
        });

        // Update comment count
        setCommentCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${post.id}`
      }, async (payload) => {
        const { new: comment, old: oldComment } = payload;

        // Handle comment updates (like soft deletes, content changes, etc.)
        setComments(prevComments => {
          const updateCommentInList = (comments: Comment[]): Comment[] => {
            return comments.map(c => {
              if (c.id === comment.id) {
                // Update the comment
                return {
                  ...c,
                  content: comment.is_deleted ? '' : comment.content,
                  author: comment.is_deleted ? { name: 'Deleted comment', avatar_url: '', avatar_storage_path: '' } : c.author,
                  likes: comment.is_deleted ? 0 : (comment.reaction_counts?.like || 0),
                  liked: comment.is_deleted ? false : c.liked,
                  attachments: comment.is_deleted ? [] : c.attachments,
                  is_deleted: comment.is_deleted || false,
                };
              }
              // Check in replies
              if (c.replies) {
                return {
                  ...c,
                  replies: c.replies.map(r => {
                    if (r.id === comment.id) {
                      return {
                        ...r,
                        content: comment.is_deleted ? '' : comment.content,
                        author: comment.is_deleted ? { name: 'Deleted comment', avatar_url: '', avatar_storage_path: '' } : r.author,
                        likes: comment.is_deleted ? 0 : (comment.reaction_counts?.like || 0),
                        liked: comment.is_deleted ? false : r.liked,
                        attachments: comment.is_deleted ? [] : r.attachments,
                        is_deleted: comment.is_deleted || false,
                      };
                    }
                    return r;
                  })
                };
              }
              return c;
            });
          };

          return updateCommentInList(prevComments);
        });

        // Update comment count when a comment is deleted or restored
        if (comment.is_deleted && !oldComment.is_deleted) {
          // Comment was deleted
          setCommentCount(prev => Math.max(0, prev - 1));
        } else if (!comment.is_deleted && oldComment.is_deleted) {
          // Comment was restored (if this feature exists in the future)
          setCommentCount(prev => prev + 1);
        }
      })
      .subscribe();

    // Subscribe to comment reactions for this post
    const commentReactionChannel = supabase
      .channel(`post-comment-reactions:${post.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comment_reactions',
        filter: `post_id=eq.${post.id}`
      }, async (payload) => {
        const { new: reaction } = payload;

        // Update comment likes in real-time
        setComments(prevComments => {
          const updateCommentLikes = (comments: Comment[]): Comment[] => {
            return comments.map(c => {
              if (c.id === reaction.comment_id) {
                return {
                  ...c,
                  likes: (c.likes || 0) + 1,
                  liked: reaction.user_id === currentUser?.id ? true : c.liked
                };
              }
              // Check in replies
              if (c.replies) {
                return {
                  ...c,
                  replies: c.replies.map(r => {
                    if (r.id === reaction.comment_id) {
                      return {
                        ...r,
                        likes: (r.likes || 0) + 1,
                        liked: reaction.user_id === currentUser?.id ? true : r.liked
                      };
                    }
                    return r;
                  })
                };
              }
              return c;
            });
          };

          return updateCommentLikes(prevComments);
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comment_reactions',
        filter: `post_id=eq.${post.id}`
      }, async (payload) => {
        const { old: reaction } = payload;

        // Update comment likes in real-time when reaction is removed
        setComments(prevComments => {
          const updateCommentLikes = (comments: Comment[]): Comment[] => {
            return comments.map(c => {
              if (c.id === reaction.comment_id) {
                return {
                  ...c,
                  likes: Math.max(0, (c.likes || 0) - 1),
                  liked: reaction.user_id === currentUser?.id ? false : c.liked
                };
              }
              // Check in replies
              if (c.replies) {
                return {
                  ...c,
                  replies: c.replies.map(r => {
                    if (r.id === reaction.comment_id) {
                      return {
                        ...r,
                        likes: Math.max(0, (r.likes || 0) - 1),
                        liked: reaction.user_id === currentUser?.id ? false : r.liked
                      };
                    }
                    return r;
                  })
                };
              }
              return c;
            });
          };

          return updateCommentLikes(prevComments);
        });
      })
      .subscribe();

    // Subscribe to post subscriptions for real-time updates
    const subscriptionChannel = supabase
      .channel(`post-subscriptions:${post.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'subscriptions',
        filter: `post_id=eq.${post.id}`
      }, async (payload) => {
        const { new: subscription } = payload;

        // Fetch user info for the new subscriber
        const { data: user } = await supabase
          .from('users')
          .select('full_name, email, avatar_url, avatar_storage_path')
          .eq('id', subscription.user_id)
          .single();

        if (user) {
          // Add new subscriber to the list
          setSubscribers(prev => [{
            created_at: subscription.created_at,
            user: user
          }, ...prev]);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'subscriptions',
        filter: `post_id=eq.${post.id}`
      }, async (payload) => {
        const { old: subscription } = payload;

        // Remove subscriber from the list
        setSubscribers(prev => prev.filter(sub => sub.user.id !== subscription.user_id));
      })
      .subscribe();

    // Cleanup subscriptions when component unmounts or post changes
    return () => {
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(commentReactionChannel);
      supabase.removeChannel(subscriptionChannel);
    };
  }, [isOpen, post.id, currentUser?.id, userCommentsThisSession]);

  // Clean up new comment animations after they complete
  useEffect(() => {
    if (newCommentIds.size > 0) {
      const timer = setTimeout(() => {
        setNewCommentIds(new Set());
        // Remove isNew flag from comments
        setComments(prevComments =>
          prevComments.map(comment => ({
            ...comment,
            isNew: false,
            replies: comment.replies?.map(reply => ({
              ...reply,
              isNew: false
            }))
          }))
        );
      }, 2000); // Match the highlightNew animation duration

      return () => clearTimeout(timer);
    }
  }, [newCommentIds]);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const modalWrap = document.querySelector('.ant-modal-wrap');
    if (!modalWrap) return;

    const handleScroll = () => {
      if (!postContentRef.current) return;
      const contentRect = postContentRef.current.getBoundingClientRect();
      const navbarHeight = 60; // px
      // Show sticky header when the post content has scrolled past the navbar
      setShowStickyHeader(contentRect.top < navbarHeight + 8); // 8px buffer
    };

    modalWrap.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => modalWrap.removeEventListener('scroll', handleScroll);
  }, [isMobile, isOpen]);

  // Disabled viewport focus management to prevent conflicts with natural typing behavior
  // The debounced input approach should handle focus retention naturally

  // Test component removed after debugging

  // Restored original mobile input handlers but with fixes

  const handleMobileInputFocus = () => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
    setIsMobileInputExpanded(true);

    // Ensure input stays focused after expansion and cursor goes to end
    setTimeout(() => {
      if (mobileCommentInputRef.current) {
        mobileCommentInputRef.current.focus();
        // Move cursor to end of text
        const textLength = mobileCommentInputRef.current.value.length;
        mobileCommentInputRef.current.setSelectionRange(textLength, textLength);
      }
    }, 0);
  };

  const handleMobileInputBlur = () => {
    // Do not collapse on blur. Mobile virtual keyboards can cause transient blurs
    // which should not dismiss the composer while typing.
    setTimeout(() => {
      setIsActionButtonClicked(false);
    }, 200);
  };

  // Add click-outside detection for more reliable collapsing
  useEffect(() => {
    const handlePointerOutside = (event: Event) => {
      if (isMobileInputExpanded && mobileCommentInputRef.current) {
        const commentBar = mobileCommentInputRef.current.closest('.mobile-comment-bar');
        if (commentBar && !commentBar.contains(event.target as Node)) {
          setIsMobileInputExpanded(false);
        }
      }
    };

    if (isMobileInputExpanded) {
      document.addEventListener('mousedown', handlePointerOutside);
      document.addEventListener('touchstart', handlePointerOutside as EventListener, { passive: true });
      return () => {
        document.removeEventListener('mousedown', handlePointerOutside);
        document.removeEventListener('touchstart', handlePointerOutside as EventListener);
      };
    }
  }, [isMobileInputExpanded]);

  const handleMobileCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const textarea = e.target;

    // Store the value in ref immediately (no re-render)
    commentTextRef.current = value;

    // Update content availability immediately for button state
    setHasContent(value.trim().length > 0);

    // Clear existing timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Handle auto-expansion immediately (no state change needed for typing)
    if (!isMobileInputExpanded && (value.length > 30 || fileList.length > 0)) {
      setIsMobileInputExpanded(true);
    }

    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;

    // Handle scrolling for long content
    if (value.length > 0) {
      const lines = value.split('\n').length;
      const estimatedLines = Math.max(lines, Math.ceil(value.length / 50));

      if (estimatedLines > 6) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }

    // Debounce the state update to prevent unnecessary re-renders
    debounceTimerRef.current = setTimeout(() => {
      setCommentText(value);
    }, 300); // Longer debounce for mobile to prevent keyboard dismissal
  }, [isMobileInputExpanded, fileList.length]);

  // Handle clicking on the input container
  const handleInputContainerClick = () => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
    setIsMobileInputExpanded(true);
    // Focus the textarea after a brief delay to ensure state is updated
    requestAnimationFrame(() => {
      if (mobileCommentInputRef.current) {
        mobileCommentInputRef.current.focus();
        // Move cursor to end of text
        const textLength = mobileCommentInputRef.current.value.length;
        mobileCommentInputRef.current.setSelectionRange(textLength, textLength);
      }
    });
  };

  // Handle reply click - set up unified input for replies
  const handleReplyClick = useCallback((commentId: string) => {
    if (isMobile) {
      // On mobile, use unified input system
      setReplyingToComment(commentId);
      setIsMobileInputExpanded(true);

      // Update placeholder and focus
      setTimeout(() => {
        if (mobileCommentInputRef.current) {
          mobileCommentInputRef.current.placeholder = "Write a reply...";
          mobileCommentInputRef.current.focus();
          const textLength = mobileCommentInputRef.current.value.length;
          mobileCommentInputRef.current.setSelectionRange(textLength, textLength);
        }
      }, 0);
    }
  }, [isMobile]);

  // Collapse after comment submission
  const handleMobileCommentSubmit = useCallback(async () => {
    if (isSubmitting) return; // Prevent double submission

    // Get the actual current value from ref
    const currentText = commentTextRef.current;
    if (!(currentText.trim() || fileList.length > 0)) return;

    setIsSubmitting(true);

    let submissionSucceeded = false;
    try {
      if (replyingToComment) {
        console.log('🔄 Submitting reply to comment ID:', replyingToComment);

        // Submit as reply using the unified function
        const result = await createCommentWithAttachments({
          content: currentText,
          parentCommentId: replyingToComment,
          files: fileList
        });

        if (result?.success) {
          // Clear the input and reset state
          commentTextRef.current = '';
          setCommentText('');
          setHasContent(false);
          setFileList([]); // Clear attachments after successful reply
          setReplyingToComment(null);
          if (mobileCommentInputRef.current) {
            mobileCommentInputRef.current.value = '';
          }
          submissionSucceeded = true;
        }
      } else {
        console.log('💬 Submitting regular comment');
        // Submit as regular comment using the unified function
        const result = await createCommentWithAttachments({
          content: currentText,
          files: fileList
        });

        if (result?.success) {
          // Clear the input and reset state
          commentTextRef.current = '';
          setCommentText('');
          setHasContent(false);
          setFileList([]);
          submissionSucceeded = true;
        }
      }

      if (submissionSucceeded) {
        // Cancel any pending debounced updates to avoid stale repopulation
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }

        // Dismiss the mobile keyboard before collapsing
        if (mobileCommentInputRef.current) {
          mobileCommentInputRef.current.blur();
          mobileCommentInputRef.current.value = '';
          mobileCommentInputRef.current.placeholder = "Join the conversation";
        }

        // Collapse the composer
        setIsMobileInputExpanded(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, replyingToComment, fileList.length, currentUser, createCommentWithAttachments]);



  // Mobile sticky header component (rendered outside modal to ensure viewport positioning)
  const MobileStickyHeader = () => (
    <div className={`mobile-sticky-header${showStickyHeader ? ' sticky-visible' : ''}`}>
      <div className="sticky-title">{post.title}</div>
      <div className="sticky-meta">
        <span className="sticky-likes">{likeCount} likes</span>
        <span className="sticky-comments">{commentCount} comments</span>
      </div>
    </div>
  );

  // Mobile navbar component (rendered outside modal to ensure viewport positioning)
  const MobileNavbar = () => {
    // Ensure we have a valid color, fallback to a neutral color
    const navbarColor = post.color || '#e6756e';

    return (
      <div
        className="mobile-navbar"
        style={{
          backgroundColor: navbarColor,
          boxShadow: `0 2px 8px ${navbarColor}`
        }}
      >
        <div className="mobile-navbar-back" onClick={handleClose}>
          <LeftOutlined />
        </div>
        <div className="mobile-navbar-title">Board Name</div>
        <div className="mobile-navbar-info" onClick={() => setShowMobileInfo(true)}>
          <InfoCircleOutlined />
        </div>
      </div>
    );
  };

  return (
    <>
      <Modal
        open={isOpen}
        onCancel={handleClose}
        footer={null}
        maskClosable={false}
        mask={true}
        width={isMobile ? window.innerWidth - 50 : '97%'}
        className={`post-popup ${isMobile ? 'mobile' : 'desktop'} ${isClosing ? 'closing' : ''}`}
        style={{
          top: isMobile ? '72px' : '70px',
          bottom: isMobile ? '64px' : 'auto',
          height: 'auto',
          maxHeight: isMobile ? '100vh' : '80vh',
          maxWidth: isMobile ? 'none' : '97vw'
        }}
        closeIcon={<span style={{ fontSize: '24px' }}>×</span>}
      >
        {/* Mobile Navbar - now rendered outside modal */}
        <div
          ref={isMobile ? popupContainerRef : undefined}
          className={`post-popup-container ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}
          style={{
            ...(isMobile ? { paddingBottom: 80 } : {}),
            ...(post.color && {
              '--post-color-rgb': (() => {
                // Convert hex color to RGB
                const hex = post.color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                return `${r}, ${g}, ${b}`;
              })()
            })
          }}
        >
          {!isMobile ? (
            <>
              {/* Desktop post popup stripe */}
              {post.color && (
                <div
                  className="desktop-post-stripe"
                  style={{ backgroundColor: post.color }}
                />
              )}
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
                                          onClick={(e) => handleAttachmentClick(attachment, e)}
                                          style={{ cursor: 'pointer' }}
                                          title={`Click to open ${attachment.file_name} in new tab`}
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
                                          onClick={(e) => handleAttachmentClick(attachment, e)}
                                          style={{ cursor: 'pointer' }}
                                          title={`Click to open ${attachment.file_name} in new tab`}
                                        >
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

                      <Button
                        className="custom-share-button"
                        icon={<ShareAltOutlined />}
                        onClick={handleShare}
                        title="Share post"
                      />
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
                          onFocus={() => {
                            if (!currentUser) {
                              onRequireSignIn();
                              return;
                            }
                          }}
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
                              disabled={isSubmitting || isFileUploading}
                              style={{
                                opacity: (isSubmitting || isFileUploading) ? 0.5 : 1,
                                pointerEvents: (isSubmitting || isFileUploading) ? 'none' : 'auto'
                              }}
                            >
                              <PaperClipOutlined />
                            </button>
                            <button
                              className="comment-action-button send"
                              onClick={() => handleCommentSubmit()}
                              title="Send comment"
                              disabled={isSubmitting}
                              style={{
                                opacity: isSubmitting ? 0.6 : 1,
                                pointerEvents: isSubmitting ? 'none' : 'auto',
                                backgroundColor: post.color || '#e6756e'
                              }}
                            >
                              {isSubmitting ? <LoadingOutlined /> : <img src={SendArrow} alt="Send" className="send-arrow-icon" />}
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
                      userCommentsThisSession={userCommentsThisSession}
                      onRequireSignIn={onRequireSignIn}
                      isSubmitting={isSubmitting}
                      isFileUploading={isFileUploading}
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
                        user={post.author}
                        size={24}
                        className="author-avatar"
                      />
                      <span className="author-name">{post.author.full_name}</span>
                    </div>
                    {/* Only show email if current user is board owner */}
                    {currentUser?.email === boardEmail && (
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
                    {subscribers.length > 0 ? (
                      <div className="avatar-group">
                        <div className="custom-avatar-group">
                          {subscribers.slice(0, 4).map((subscriber, index) => (
                            <Avatar
                              key={subscriber.user.id || index}
                              user={subscriber.user}
                              size={32}
                              style={{
                                marginLeft: index > 0 ? -8 : 0,
                                border: '2px solid #fff',
                                zIndex: 4 - index
                              }}
                            />
                          ))}
                          {subscribers.length > 4 && (
                            <div 
                              className="avatar-more"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: '#f5f5f5',
                                color: '#281010',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 'bold',
                                border: '2px solid #fff',
                                marginLeft: -8,
                                zIndex: 0
                              }}
                            >
                              +{subscribers.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="subscribe-export-buttons">
                          <SubscribeButton />
                        </div>
                      </div>
                    ) : (
                      <div className="subscribe-export-buttons no-subscribers">
                        <SubscribeButton />
                      </div>
                    )}
                    <ExportCSVButton />
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
                  user={post.author}
                  size={40}
                  className="author-avatar"
                />
                <span className="author-name">{post.author.full_name}</span>
                <span className="post-time">
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
              <div className="post-content-section" ref={postContentRef}>
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
                      <span className="like-count">{post.reaction_counts?.like || 0}</span>
                    </Button>
                    <Button className="custom-comment-button" icon={<MessageOutlined />}>
                      <span className="comment-count">{commentCount}</span>
                    </Button>
                    <Button
                      className="custom-share-button"
                      icon={<ShareAltOutlined />}
                      onClick={handleShare}
                      title="Share post"
                    />
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
                    onReplyClick={handleReplyClick}
                    replyingToComment={replyingToComment}
                    userCommentsThisSession={userCommentsThisSession}
                    onRequireSignIn={onRequireSignIn}
                    isSubmitting={isSubmitting}
                    isFileUploading={isFileUploading}
                  />
                </div>
              </div>
              {/* Fixed mobile comment bar - Reddit style */}
              {/* This component is now rendered outside the modal */}
            </>
          )}
        </div>
      </Modal>
      {isMobile && isOpen && post && post.color && <MobileNavbar />}
      {isMobile && isOpen && (
        <div className={`mobile-comment-bar ${isMobileInputExpanded ? 'expanded' : 'collapsed'}`}>
          {fileList.length > 0 && (
            <div className="comment-file-preview-container mobile-preview">
              {fileList.map((file, index) => (
                <div key={index} className="comment-file-preview-wrapper">
                  <div className="file-preview-item">
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
                </div>
              ))}
            </div>
          )}

          <div
            className="mobile-input-main-row"
            onClick={handleInputContainerClick}
          >
            <textarea
              ref={mobileCommentInputRef}
              placeholder={replyingToComment ? "Write a reply..." : "Join the conversation"}
              className="comment-input mobile-comment-input"
              onChange={handleMobileCommentChange}
              onFocus={handleMobileInputFocus}
              onBlur={handleMobileInputBlur}
              onClick={handleInputContainerClick}
              rows={1}
              style={{
                resize: 'none',
                outline: 'none',
                border: 'none',
                background: 'transparent',
                fontSize: '16px'
              }}
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck="false"
            />
          </div>

          {isMobileInputExpanded && (
            <>
              <div className="mobile-input-divider"></div>
              <div className="mobile-action-buttons-row">
                <button
                  className="comment-action-button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsActionButtonClicked(true);
                    handleFileAttachment();
                  }}
                  title="Attach files"
                  disabled={isSubmitting || isFileUploading}
                  style={{
                    opacity: (isSubmitting || isFileUploading) ? 0.5 : 1,
                    pointerEvents: (isSubmitting || isFileUploading) ? 'none' : 'auto'
                  }}
                >
                  <PaperClipOutlined />
                </button>
                <button
                  className="comment-action-button send"
                  onMouseDown={async (e) => {
                    e.preventDefault();
                    setIsActionButtonClicked(true);
                    await handleMobileCommentSubmit();
                  }}
                  title="Send comment"
                  disabled={isSubmitting || (!hasContent && fileList.length === 0)}
                  style={{
                    backgroundColor: post.color || '#e6756e'
                  }}
                >
                  {isSubmitting ? <LoadingOutlined /> : <img src={SendArrow} alt="Send" className="send-arrow-icon" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {isMobile && isOpen && <MobileStickyHeader />}

      {/* Mobile Info Panel */}
      {isMobile && showMobileInfo && (
        <>
          {/* Backdrop */}
          <div
            className="blur-background"
            onClick={() => setShowMobileInfo(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 200000,
            }}
          />
          {/* Info Panel */}
          <div className="mobile-info-panel">
            <div className="about-section">
              <h3>About</h3>
              <div className="author-info">
                <Avatar
                  user={post.author}
                  size={24}
                  className="author-avatar"
                />
                <span className="author-name">{post.author.full_name}</span>
              </div>
              <div className="author-email">
                <img src={MailIcon} alt="mail" className="mail-icon" />
                <span>{post.author.email}</span>
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
              {subscribers.length > 0 ? (
                <div className="avatar-group">
                  <div className="custom-avatar-group">
                    {subscribers.slice(0, 4).map((subscriber, index) => (
                      <Avatar
                        key={subscriber.user.id || index}
                        user={subscriber.user}
                        size={32}
                        style={{
                          marginLeft: index > 0 ? -8 : 0,
                          border: '2px solid #fff',
                          zIndex: 4 - index
                        }}
                      />
                    ))}
                    {subscribers.length > 4 && (
                      <div 
                        className="avatar-more"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#f5f5f5',
                          color: '#281010',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 'bold',
                          border: '2px solid #fff',
                          marginLeft: -8,
                          zIndex: 0
                        }}
                      >
                        +{subscribers.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="subscribe-export-buttons">
                    <SubscribeButton />
                  </div>
                </div>
              ) : (
                <div className="subscribe-export-buttons no-subscribers">
                  <SubscribeButton />
                </div>
              )}
              <ExportCSVButton />
            </div>
          </div>
        </>
      )}
    </>
  );
} 