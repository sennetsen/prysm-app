import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, Navigate, useNavigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import HomePage from './CompanySite/HomePage';
import { supabase } from "./supabaseClient";
import Navbar from "./components/features/board/Navbar";
import Sidebar from "./components/features/board/Sidebar";
import RequestCard from "./components/features/posts/RequestCard";
import { MentionTest } from "./components/features/comments/MentionTest";
import "./App.css";
import { Button, Checkbox, Form, Tooltip, Modal, message } from 'antd';
import Avatar from './components/shared/Avatar';
import { lightenColor } from './utils/colorUtils'; // Import the lightenColor function
import { GoogleSignInButton } from './supabaseClient';
import { syncUserAvatar } from './utils/avatarUtils';
import postbutton from './img/postbutton.svg';
import helpmascot from './img/helpmascot.jpg';
import { handleSignOut } from './components/shared/UserProfile';
import fallbackImg from './img/fallback.png';
import mailicon from './img/mail.svg';
import { PostPopup } from './components/features/posts/PostPopup';
import './components/features/posts/PostPopup.css';
import { PaperClipOutlined, CloseOutlined, FileOutlined } from '@ant-design/icons';

// Add this function after the imports and before the BoardView component
async function uploadPostAttachment(file, postId, authorId) {
  console.log('Uploading attachment for postId:', postId, 'Type:', typeof postId);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("parentId", postId);
  formData.append("parentType", "post");

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
    parent_type: 'post',
    parent_id: postId,
    author_id: authorId,
  }]);

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error("Failed to upload attachment into database: " + error.message);
  }

  return storage_path;
}

// Replace the existing deleteAllPostAttachments function with this debug version
async function deleteAllPostAttachments(postId) {
  try {
    console.log(' Starting deleteAllPostAttachments for postId:', postId);

    // 1. FIRST: Get all attachments for this post (both post and comment attachments)
    // Use separate queries instead of complex OR with subquery
    const [postAttachments, commentAttachments] = await Promise.all([
      // Get post attachments
      supabase
        .from('attachments')
        .select('storage_path')
        .eq('parent_type', 'post')
        .eq('parent_id', postId),

      // Get comment attachments by first getting comment IDs, then their attachments
      supabase
        .from('comments')
        .select('id')
        .eq('post_id', postId)
        .then(async ({ data: commentIds, error: commentError }) => {
          console.log('🔍 Found comment IDs:', commentIds);
          if (commentError || !commentIds || commentIds.length === 0) {
            console.log('ℹ️ No comments found for this post');
            return { data: [], error: null };
          }

          const commentIdList = commentIds.map(c => c.id);
          console.log(' Comment ID list:', commentIdList);

          const result = await supabase
            .from('attachments')
            .select('storage_path')
            .eq('parent_type', 'comment')
            .in('parent_id', commentIdList);

          console.log('📎 Comment attachments query result:', result);
          return result;
        })
    ]);

    console.log('📎 Post attachments result:', postAttachments);
    console.log('📎 Comment attachments result:', commentAttachments);

    if (postAttachments.error) {
      console.error('Error fetching post attachments:', postAttachments.error);
      throw postAttachments.error;
    }

    if (commentAttachments.error) {
      console.error('Error fetching comment attachments:', commentAttachments.error);
      throw commentAttachments.error;
    }

    // Combine all attachments
    const allAttachments = [
      ...(postAttachments.data || []),
      ...(commentAttachments.data || [])
    ];

    console.log('📎 Combined all attachments to delete:', allAttachments);

    // 2. SECOND: Delete all files from R2 first
    if (allAttachments.length > 0) {
      for (const attachment of allAttachments) {
        try {
          console.log('🗑️ Attempting to delete from R2:', attachment.storage_path);

          const response = await fetch(`https://prysm-r2-worker.prysmapp.workers.dev/delete/${attachment.storage_path}`, {
            method: 'DELETE',
          });

          console.log(' R2 delete response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to delete file from R2:', attachment.storage_path, 'Status:', response.status, 'Error:', errorText);
          } else {
            console.log('✅ Successfully deleted from R2:', attachment.storage_path);
          }
        } catch (r2Error) {
          console.error('💥 Error deleting from R2:', r2Error);
        }
      }
    } else {
      console.log('ℹ️ No attachments found to delete');
    }

    // 3. THIRD: Delete ALL attachments from database after R2 cleanup
    console.log('🗄️ Deleting attachments from database...');

    // Delete post attachments
    const { error: postDeleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('parent_type', 'post')
      .eq('parent_id', postId);

    if (postDeleteError) {
      console.error('Error deleting post attachments:', postDeleteError);
    }

    // Fix the comment attachments deletion part
    // Delete comment attachments
    if (commentAttachments.data && commentAttachments.data.length > 0) {
      // Get the comment IDs from the comments query, not from attachments
      const { data: commentIds } = await supabase
        .from('comments')
        .select('id')
        .eq('post_id', postId);

      if (commentIds && commentIds.length > 0) {
        const commentIdList = commentIds.map(c => c.id);
        console.log('🗄️ Deleting comment attachments for comment IDs:', commentIdList);

        const { error: commentDeleteError } = await supabase
          .from('attachments')
          .delete()
          .eq('parent_type', 'comment')
          .in('parent_id', commentIdList);

        if (commentDeleteError) {
          console.error('Error deleting comment attachments:', commentDeleteError);
        } else {
          console.log('✅ Successfully deleted comment attachments from database');
        }
      }
    } else {
      console.log('ℹ️ No comment attachments to delete from database');
    }

    console.log('✅ Successfully deleted all attachments for post:', postId);
  } catch (error) {
    console.error('Error in deleteAllPostAttachments:', error);
    throw error;
  }
}

// Component to handle redirects for invalid board paths
function BoardRedirect() {
  const { boardPath } = useParams();
  return <Navigate to={`/${boardPath}`} replace />;
}

function BoardView() {
  const { boardPath, postId } = useParams();
  const navigate = useNavigate();
  const [boardData, setBoardData] = useState(null);
  const [boardNotFound, setBoardNotFound] = useState(false);
  const [user, setUser] = useState(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const [cards, setCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [modalColor, setModalColor] = useState("#FEEAA4");
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [isQuestionPopupOpen, setIsQuestionPopupOpen] = useState(false);
  const [isBoardOwner, setIsBoardOwner] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [navbarColor, setNavbarColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [isJoinPopupOpen, setIsJoinPopupOpen] = useState(false);
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [postColors, setPostColors] = useState([]);
  const [isContactCardOpen, setIsContactCardOpen] = useState(false);
  const [contactCardData, setContactCardData] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [postFileList, setPostFileList] = useState([]);
  const [sortType, setSortType] = useState('new'); // Add sort state
  const [isLoadingDirectPost, setIsLoadingDirectPost] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort handler function
  const handleSortChange = (newSortType) => {
    setSortType(newSortType);
  };

  // Helper function to sort cards
  const sortCards = (cards, sortType) => {
    return [...cards].sort((a, b) => {
      if (sortType === 'top') {
        // Sort by likes count (descending)
        return b.likesCount - a.likesCount;
      } else {
        // Sort by created_at (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  };

  const defaultColors = useMemo(() => [
    "#FEEAA4",
    "#D4D6F9",
    "#FECFCF"
  ], []);

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*, owner:users(avatar_url, avatar_storage_path, id)')
        .eq('url_path', boardPath)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching board:', error);
        setBoardNotFound(true);
        return;
      }

      console.log('Board data fetched:', data);
      setBoardData(data);
      setNavbarColor(data.color);
      setIsBoardOwner(user?.email === data.email);
      setPostColors(data.post_colors || defaultColors);
      document.documentElement.style.setProperty('--navbar-color', data.color);
    };

    if (boardPath) {
      fetchBoardData();
    }
  }, [boardPath, user?.id, user?.email, defaultColors]);

  useEffect(() => {
    if (boardData?.creator_name && boardData?.title) {
      document.title = `${boardData.title} | ${boardData.creator_name} | Prysm`;
    } else {
      document.title = "Prysm";
    }
  }, [boardData?.creator_name, boardData?.title]);

  useEffect(() => {
    // Update the meta theme color
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor && navbarColor) {
      metaThemeColor.setAttribute("content", navbarColor);
    }
  }, [navbarColor]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { count } = await supabase
          .from('posts')
          .select('id', { count: 'exact' })
          .eq('author_id', session.user.id);

        setTotalRequests(count);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        syncUserAvatar(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!boardData?.id) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users(full_name, avatar_url, avatar_storage_path, email, created_at),
        reactions(reaction_type, user_id)
      `)
      .eq('board_id', boardData.id);

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    // Fetch attachments and comment counts for all posts
    let attachmentsData = [];
    let commentCountsData = {};
    if (data && data.length > 0) {
      const postIds = data.map(post => post.id);

      // Fetch attachments
      const { data: attachments, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .eq('parent_type', 'post')
        .in('parent_id', postIds);

      if (!attachmentsError && attachments) {
        attachmentsData = attachments;
      }

      // Fetch comment counts
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);

      if (!commentsError && comments) {
        // Count comments per post
        commentCountsData = comments.reduce((acc, comment) => {
          acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const postsWithLikes = data.map(post => {
      const likesCount = post.reaction_counts?.like || 0;
      const commentCount = commentCountsData[post.id] || 0;
      // Find attachments for this post
      const postAttachments = attachmentsData.filter(att => att.parent_id === post.id);

      return {
        ...post,
        board_id: boardData?.id, // Ensure board_id is included
        likesCount,
        commentCount,
        attachments: postAttachments,
        author: post.author || {
          full_name: 'Anonymous',
          avatar_url: null,
          email: null,
          created_at: null
        }
      };
    });

    // Sort posts using helper function
    const sortedPosts = sortCards(postsWithLikes, sortType);
    setCards(sortedPosts);
    setTotalPosts(sortedPosts.length);

    // Check if there's a direct post URL and open it
    if (postId) {
      const directPost = sortedPosts.find(post => post.id === postId);
      if (directPost) {
        setSelectedPost({
          ...directPost,
          board_id: boardData?.id
        });
      } else {
        // Invalid post ID - redirect to board URL
        navigate(`/${boardPath}`);
      }
    }
  }, [boardData, sortType, postId]);

  useEffect(() => {
    if (boardData) {
      fetchPosts();
    }
  }, [boardData, fetchPosts]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      // Check if there's a post in the URL path
      const currentPath = window.location.pathname;
      const isPostPath = currentPath.includes('/posts/');

      if (!isPostPath) {
        // No post in URL, close the popup
        setSelectedPost(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Re-sort cards when sort type changes
  useEffect(() => {
    setCards(prev => sortCards(prev, sortType));
  }, [sortType]);

  useEffect(() => {
    if (!boardData?.id) return;

    // Subscribe to post inserts and deletes
    const postsSubscription = supabase
      .channel('posts-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `board_id=eq.${boardData.id}`
      }, async (payload) => {
        // Fetch full post data with author info
        const { data: newPost } = await supabase
          .from('posts')
          .select(`
            *,
            author:users(full_name, avatar_url, avatar_storage_path),
            reactions(reaction_type, user_id)
          `)
          .eq('id', payload.new.id)
          .single();

        if (newPost) {
          setCards(prev => {
            const newCardData = {
              ...newPost,
              board_id: boardData?.id, // Ensure board_id is included
              likesCount: newPost.reactions.filter(r => r.reaction_type === 'like').length,
              isNew: true
            };
            const updatedCards = [...prev, newCardData];
            return sortCards(updatedCards, sortType);
          });
          setTotalPosts(prev => prev + 1);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
        filter: `board_id=eq.${boardData.id}`
      }, (payload) => {
        // Update local state only after animation completes
        setTimeout(() => {
          setCards(prev => prev.filter(card => card.id !== payload.old.id));
          setTotalPosts(prev => prev - 1);
        }, 300); // Match animation duration
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsSubscription);
    };
  }, [boardData?.id]);

  const handleProfileClick = () => {
    setIsProfilePopupOpen(!isProfilePopupOpen);
    setIsQuestionPopupOpen(false);
    setIsSharePopupOpen(false);
  };

  const handleQuestionClick = () => {
    setIsQuestionPopupOpen(!isQuestionPopupOpen);
    setIsProfilePopupOpen(false);
    setIsSharePopupOpen(false);
  };

  const handleShareClick = () => {
    const boardUrl = window.location.href;
    navigator.clipboard.writeText(boardUrl);
    setIsSharePopupOpen(!isSharePopupOpen);
    setIsProfilePopupOpen(false);
    setIsQuestionPopupOpen(false);
  };

  const handlePostItClick = () => {
    const randomColor = postColors[Math.floor(Math.random() * postColors.length)];
    setModalColor(randomColor);
    setIsModalOpen(true);
  };

  const handleFileAttachment = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';

    fileInput.onchange = (e) => {
      const target = e.target;
      if (target.files && target.files.length > 0) {
        const files = Array.from(target.files);

        // Check file size
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        if (totalSize > 50 * 1024 * 1024) {
          message.error('Total file size should not exceed 50MB');
          return;
        }

        // Create previews for images
        files.forEach(file => {
          if (file.type.startsWith('image/')) {
            file.preview = URL.createObjectURL(file);
          }
        });

        setPostFileList([...postFileList, ...files]);
        message.success(`${files.length} file${files.length === 1 ? '' : 's'} attached`);
      }
    };

    fileInput.click();
  };

  const removePostFile = (fileToRemove) => {
    setPostFileList(postFileList.filter(file => file !== fileToRemove));
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewPostContent("");
    setNewPostTitle("");
    setIsAnonymous(false);
    setPostFileList([]);
    setModalColor(postColors[Math.floor(Math.random() * postColors.length)]);
    setIsSubmitting(false); // Reset loading state

    // Clean up file previews
    postFileList.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
  };

  const handlePostSubmit = async () => {
    if (newPostContent.trim() && newPostTitle.trim()) {
      setIsSubmitting(true); // Set loading state
      
      const postData = {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        is_anonymous: isAnonymous,
        color: modalColor,
        author_id: user?.id,
        board_id: boardData.id,
      };

      console.log('Post Data:', postData); // Log the post data

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select(); // Request the inserted data

      console.log('Insert Data:', data); // Log the response data
      console.log('Insert Error:', error); // Log any error

      if (error) {
        console.error('Error adding post:', error);
        setIsSubmitting(false); // Clear loading state on error
        return;
      }

      if (data && data.length > 0) {
        const postId = data[0].id;

        // Upload attachments if any
        if (postFileList.length > 0) {
          try {
            for (const file of postFileList) {
              await uploadPostAttachment(file, postId, user.id);
            }
          } catch (err) {
            console.error('Attachment upload error:', err);
            message.error('Failed to upload one or more attachments');
          }
        }

        // Auto-subscribe the author to their own post
        // This ensures authors get notified about comments and activity on their posts
        try {
          // Check if user is already subscribed (though this shouldn't happen for new posts)
          // But we'll keep the check for future-proofing and performance
          const { data: existingSubscription } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', postId)
            .single();

          if (existingSubscription) {
            console.log('User already subscribed to post, skipping upsert');
          } else {
            const { error: subscribeError } = await supabase
              .from('subscriptions')
              .upsert([{
                user_id: user.id,
                post_id: postId
              }], {
                onConflict: 'user_id,post_id' // Use upsert to prevent duplicates
              });

            if (subscribeError) {
              console.warn('Failed to auto-subscribe author to post:', subscribeError);
              // Don't show error to user since this is automatic
            } else {
              console.log('Author automatically subscribed to their post');
            }
          }
        } catch (subscribeErr) {
          console.warn('Error auto-subscribing author to post:', subscribeErr);
          // Don't show error to user since this is automatic
        }

        // Initialize reactions as an empty array
        const newPost = {
          ...data[0],
          board_id: boardData?.id, // Ensure board_id is included
          author: {
            full_name: user.user_metadata.full_name,
            avatar_url: user.user_metadata.avatar_url
          },
          reactions: []
        };
        setCards(prevCards => [newPost, ...prevCards]); // Add new post at the beginning
        setTotalPosts(prev => prev + 1);
        setTotalRequests(prev => prev + 1);
        
        // Show success notification
        message.success('Post submitted!');
        
        handleModalClose();
      } else {
        console.error('No data returned from insert operation');
      }
    }
    
    setIsSubmitting(false); // Clear loading state
  };

  const handleOutsideClick = (e) => {
    if (!e.target.closest('.profile-popup') &&
      !e.target.closest('.question-popup') &&
      !e.target.closest('.share-popup') &&
      !e.target.closest('.profile-icon') &&
      !e.target.closest('.question-icon') &&
      !e.target.closest('.share-button')) {
      setIsProfilePopupOpen(false);
      setIsQuestionPopupOpen(false);
      setIsSharePopupOpen(false);
    }
  };

  // Update the handleDelete function to use the new simpler approach
  const handleDelete = async (id) => {
    try {
      // 1. FIRST: Get all attachments BEFORE deleting the post
      await deleteAllPostAttachments(id);

      // 2. SECOND: Delete post (this triggers CASCADE for comments, reactions, etc.)
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting post:', error);
        return;
      }

      // 3. Update local state only after successful deletion
      setCards(cards.filter(card => card.id !== id));
      setTotalPosts(prev => prev - 1);
      setTotalRequests(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleLike = async (postId, isCurrentlyLiked) => {
    if (!user) {
      setIsJoinPopupOpen(true);
      return;
    }

    try {
      const { data: currentReactions, error: fetchError } = await supabase
        .from('reactions')
        .select()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('reaction_type', 'like');

      if (fetchError) throw fetchError;

      if (currentReactions.length > 0) {
        // If like exists, delete it
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('id', currentReactions[0].id);

        if (deleteError) throw deleteError;

        // Decrement like count in reaction_counts
        const { data: postData } = await supabase
          .from('posts')
          .select('reaction_counts')
          .eq('id', postId)
          .single();

        const currentCount = postData.reaction_counts?.like || 0;
        const newCount = Math.max(0, currentCount - 1);

        await supabase
          .from('posts')
          .update({
            reaction_counts: { ...postData.reaction_counts, like: newCount }
          })
          .eq('id', postId);
      } else {
        // If no like exists, create it
        const { error: insertError } = await supabase
          .from('reactions')
          .insert([{
            post_id: postId,
            user_id: user.id,
            reaction_type: 'like'
          }]);

        if (insertError) throw insertError;

        // Increment like count in reaction_counts
        const { data: postData } = await supabase
          .from('posts')
          .select('reaction_counts')
          .eq('id', postId)
          .single();

        const currentCount = postData.reaction_counts?.like || 0;
        const newCount = currentCount + 1;

        await supabase
          .from('posts')
          .update({
            reaction_counts: { ...postData.reaction_counts, like: newCount }
          })
          .eq('id', postId);
      }

      // Update local state without sorting
      setCards(prevCards => prevCards.map(card => {
        if (card.id === postId) {
          const currentLikes = Number.isInteger(card.likesCount) ? card.likesCount : 0;
          const newLikesCount = isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1;
          const newReactions = isCurrentlyLiked
            ? card.reactions.filter(r => r.user_id !== user.id)
            : [...card.reactions, { user_id: user.id, reaction_type: 'like' }];

          return {
            ...card,
            likesCount: newLikesCount,
            reactions: newReactions
          };
        }
        return card;
      }));
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };
  useEffect(() => {
    if (isProfilePopupOpen || isQuestionPopupOpen || isSharePopupOpen) {
      document.addEventListener('click', handleOutsideClick);
    } else {
      document.removeEventListener('click', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isProfilePopupOpen, isQuestionPopupOpen, isSharePopupOpen]);

  useEffect(() => {
    if (navbarColor) {
      const lightShade = lightenColor(navbarColor, 75);
      setBackgroundColor(lightShade);
      document.documentElement.style.setProperty('--scrollbar-track-color', lightShade);
    }
  }, [navbarColor]);


  const handleJoinClick = () => {
    setIsJoinPopupOpen(true);
  };

  const handleClosePopup = () => {
    const joinPopup = document.querySelector('.join-popup-content');
    const overlay = document.querySelector('.modal-overlay');

    // Add fade-out animations to both the popup and overlay
    joinPopup.classList.add('fade-out');
    overlay.classList.add('fade-out');

    // Wait for the animation to complete before updating state
    setTimeout(() => {
      setIsJoinPopupOpen(false);
      joinPopup.classList.remove('fade-out');
      overlay.classList.remove('fade-out');
    }, 200); // Match the animation duration
  };

  const handleContactCardToggle = (card) => {
    if (!user) {
      setIsJoinPopupOpen(true);
      return;
    }

    // Ensure author object has all necessary fields
    const authorData = {
      ...card.author,
      created_at: card.author?.created_at || card.created_at
    };

    setContactCardData({
      ...card,
      author: authorData
    });
    setIsContactCardOpen(!isContactCardOpen);
  };

  const handleContactCardClose = () => {
    const contactPopup = document.querySelector('.contact-card-popup');
    const overlay = document.querySelector('.modal-overlay');

    // Add fade-out animations to both the popup and overlay
    contactPopup.classList.add('fade-out');
    overlay.classList.add('fade-out');

    // Wait for the animation to complete before updating state
    setTimeout(() => {
      setIsContactCardOpen(false);
      contactPopup.classList.remove('fade-out');
      overlay.classList.remove('fade-out');
    }, 200); // Match the animation duration
  };

  const handlePostClick = (post) => {
    // Ensure the post has the board_id for the activity stream
    setSelectedPost({
      ...post,
      board_id: boardData?.id
    });

    // Navigate to the post URL using React Router
    navigate(`/${boardPath}/posts/${post.id}`);
  };

  // Added function to update likes in the board view from a post popup
  const handlePostLikeUpdate = useCallback((postId, newLikeCount, isLiked) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if (card.id === postId) {
          // Update the card with new like count and reactions
          const updatedReactions = isLiked
            ? [...(card.reactions || []), { user_id: user?.id, reaction_type: 'like' }]
            : (card.reactions || []).filter(r => !(r.user_id === user?.id && r.reaction_type === 'like'));

          return {
            ...card,
            likesCount: newLikeCount,
            reactions: updatedReactions
          };
        }
        return card;
      })
    );

    // Also update the selected post so it stays in sync
    setSelectedPost(prevSelected => {
      if (prevSelected && prevSelected.id === postId) {
        return {
          ...prevSelected,
          board_id: boardData?.id, // Ensure board_id is preserved
          likesCount: newLikeCount,
          reactions: isLiked
            ? [...(prevSelected.reactions || []), { user_id: user?.id, reaction_type: 'like' }]
            : (prevSelected.reactions || []).filter(r => !(r.user_id === user?.id && r.reaction_type === 'like'))
        };
      }
      return prevSelected;
    });
  }, [user?.id, boardData?.id]);

  // Stable onClose function for PostPopup
  const handlePostPopupClose = useCallback(() => {
    setSelectedPost(null);
    // Navigate back to the board
    navigate(`/${boardPath}`);
  }, [navigate, boardPath]);

  const toggleSidebar = () => setIsSidebarHidden((h) => !h);

  if (boardNotFound) {
    return <Navigate to="/" />; // Redirect if board not found
  }

  return (
    <div className="app" style={{ backgroundColor }}>
      <Navbar
        onProfileClick={handleProfileClick}
        onQuestionClick={handleQuestionClick}
        title={boardData?.title}
        color={navbarColor}
        onJoinClick={handleJoinClick}
        onShare={handleShareClick}
        onSortChange={handleSortChange}
      />
      <div className={`main-content${isSidebarHidden ? ' sidebar-hidden' : ' sidebar-open'}`}>
        <Sidebar
          description={boardData?.description}
          bio={boardData?.bio}
          totalPosts={totalPosts}
          creatorName={boardData?.creator_name}
          avatarUrl={boardData?.owner?.avatar_url}
          creatorAvatar={boardData?.creator_avatar}
          posts={cards}
          color={boardData?.color}
          isHidden={isSidebarHidden}
          toggleSidebar={toggleSidebar}
          boardId={boardData?.id}
          currentUserId={user?.id}
          boardCreatorId={boardData?.owner_id}

        />
        <div className={`board${isSidebarHidden ? ' sidebar-hidden' : ' sidebar-open'}`}>
          {cards.length === 0 && (
            <p className="empty-board-message">No posts yet. Click the button to add one!</p>
          )}
          {cards.map((card, index) => (
            <RequestCard
              key={card.id}
              id={card.id}
              title={card.title}
              content={card.content}
              isAnonymous={card.is_anonymous}
              color={card.color}
              onDelete={() => handleDelete(card.id)}
              authorId={card.author_id}
              created_at={card.created_at}
              author={card.author}
              currentUserId={user?.id}
              isBoardOwner={isBoardOwner}
              onLike={() => handleLike(card.id, card.reactions?.some(r => r.user_id === user?.id && r.reaction_type === 'like'))}
              likesCount={card.likesCount}
              reactions={card.reactions || []}
              index={index}
              onContactCardToggle={() => handleContactCardToggle(card)}
              onPostClick={handlePostClick}
              attachments={card.attachments || []}
              commentCount={card.commentCount || 0}
            />
          ))}
          <Tooltip title="Make a Request" placement="right">
            <Button
              className="create-post-it-button"
              onClick={user ? handlePostItClick : handleJoinClick}
              style={{
                backgroundColor: navbarColor,
                '--navbar-color': navbarColor
              }}
            >
              <img src={postbutton} alt="Create post" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal post-it-modal" style={{ backgroundColor: modalColor, opacity: 1 }}>
            <button className="request-close-button" onClick={handleModalClose}>
              &times;
            </button>
            <h3 className="modal-title">
              <input
                type="text"
                placeholder="Request title"
                value={newPostTitle}
                onChange={(e) => {
                  if (e.target.value.length <= 23) {
                    setNewPostTitle(e.target.value);
                  }
                }}
                className="title-input"
                maxLength={23}
              />
            </h3>
            <textarea
              placeholder="Start typing your request..."
              value={newPostContent}
              onChange={(e) => {
                if (e.target.value.length <= 300) {
                  setNewPostContent(e.target.value);
                }
              }}
              className="content-input"
            ></textarea>
            <Form.Item className="hide-name-container">
              <Checkbox
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="hide-name-checkbox"
              >
                <span className="hide-name-text">Hide my name</span>
              </Checkbox>
            </Form.Item>

            {/* File attachment section */}
            {postFileList.length > 0 && (
              <div className="post-file-preview-container">
                {postFileList.map((file, index) => (
                  <div key={index} className="post-file-preview-wrapper">
                    {file.type.startsWith('image/') ? (
                      <div className="post-image-preview-with-name">
                        <div className="post-image-preview">
                          <img
                            src={file.preview || URL.createObjectURL(file)}
                            alt={file.name}
                            className="preview-image"
                          />
                          <button
                            className="remove-image-button"
                            onClick={() => removePostFile(file)}
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                        <div className="post-image-filename">
                          <FileOutlined />
                          <span className="filename-text">{file.name}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="post-file-preview-item">
                        <FileOutlined />
                        <span className="file-name">{file.name}</span>
                        <button
                          className="remove-file"
                          onClick={() => removePostFile(file)}
                          title="Remove file"
                        >
                          <CloseOutlined />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="modal-footer">
              <button
                className="attach-button"
                onClick={handleFileAttachment}
                title="Attach files"
                type="button"
                disabled={isSubmitting}
              >
                <PaperClipOutlined />
              </button>
              <div className="modal-footer-right">
                <span className="char-count">{`${newPostContent.length}/300`}</span>
                <button
                  className="post-button"
                  onClick={handlePostSubmit}
                  disabled={!newPostContent.trim() || !newPostTitle.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Requesting...' : 'Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProfilePopupOpen && (
        <div className="profile-popup">
          <h2>Hello{user?.user_metadata?.name ? `, ${user.user_metadata.name.split(' ')[0]}` : ''}!</h2>
          <p>Requests Made: {totalRequests || '0'}</p>
          <p>Joined {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}</p>
          <button className="logout-button" onClick={() => handleSignOut(() => setUser(null), user)}
          >Log Out</button>
        </div>
      )}

      {isQuestionPopupOpen && (
        <div className="help-popup">
          <h2>Thanks for using us!</h2>
          <p>Prysm is still in beta.</p>
          <p>Waitlist at <a href="https://prysmapp.com">prysmapp.com</a> </p>
          <p>or contact us at</p>
          <p><a href="mailto:getprysm@gmail.com">getprysm@gmail.com</a>!</p>
          <img src={helpmascot} className="help-mascot" alt="Help mascot" />
        </div>
      )}

      {isJoinPopupOpen && (
        <div className="modal-overlay">
          <div className="join-popup-content">
            <button className="join-popup-close" onClick={handleClosePopup}>
              &times;
            </button>
            <h2>Welcome!</h2>
            <p>Sign in or sign up to interact</p>
            <p>with this board.</p>
            <div className="google-signin-container">
              {/* <div className="mascot-overlay">
                <img src={joinmascot} className="join-mascot" alt="Join mascot" />
              </div> */}
              <GoogleSignInButton onSuccess={() => {
                handleClosePopup();
                window.location.reload();
              }} />
            </div>
          </div>
        </div>
      )}

      {isSharePopupOpen && (
        <div className="share-popup">
          <h3>Link Copied!</h3>
          <div className="link-container">
            <span className="link-text">{window.location.href}</span>
          </div>
        </div>
      )}

      {isContactCardOpen && contactCardData && (
        <div className="modal-overlay">
          <div className="contact-card-popup">
            <button className="close-popup" onClick={handleContactCardClose}>&times;</button>
            <div className="profile-picture">
              <Avatar
                user={contactCardData.author}
                size={80}
                className="profile-pic"
              />
            </div>
            <div className="contact-info">
              <h2>
                {contactCardData.is_anonymous && !isBoardOwner ? 'Anonymous' : contactCardData.author?.full_name || 'Anonymous'}
              </h2>
              {isBoardOwner && contactCardData.author?.email && (
                <p className="email">
                  <img src={mailicon} alt="Mail icon" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  <a href={`mailto:${contactCardData.author.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {contactCardData.author.email}
                  </a>
                </p>
              )}
              {!contactCardData.is_anonymous || isBoardOwner ? (
                <>
                  <p>Total Requests On This Board: {cards.filter(card => card.author_id === contactCardData.author_id).length}</p>
                  <p>Joined: {new Date(contactCardData.author?.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}</p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <PostPopup
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={handlePostPopupClose}
          currentUser={user}
          onPostLikeChange={handlePostLikeUpdate}
          boardCreatorId={boardData?.owner_id}
          boardEmail={boardData?.email}
          onRequireSignIn={() => setIsJoinPopupOpen(true)}
        />
      )}

    </div>
  );
}

// Main App component
function App() {
  return (
    <>
      <SpeedInsights />
      <Router>
        <Routes>
          {/* Root path removed - Vercel redirects / to home.prysmapp.com */}
          <Route path="/mention-test" element={<MentionTest />} />
          <Route path="/posts/*" element={<Navigate to="/" />} />
          <Route path="/:boardPath/posts/:postId" element={<BoardView />} />
          <Route path="/:boardPath/*" element={<BoardRedirect />} />
          <Route path="/:boardPath" element={<BoardView />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Analytics />
      </Router>
    </>
  );
}

export default App;

