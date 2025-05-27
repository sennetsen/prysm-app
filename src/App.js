import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import HomePage from './CompanySite/HomePage';
import { supabase } from "./supabaseClient";
import Navbar from "./components/features/board/Navbar";
import Sidebar from "./components/features/board/Sidebar";
import RequestCard from "./components/features/posts/RequestCard";
import { MentionTest } from "./components/features/comments/MentionTest";
import "./App.css";
import { Button, Checkbox, Form, Tooltip, Modal, Avatar, message } from 'antd';
import { lightenColor } from './utils/colorUtils'; // Import the lightenColor function
import { GoogleSignInButton } from './supabaseClient';
import postbutton from './img/postbutton.svg';
import helpmascot from './img/helpmascot.jpg';
import { handleSignOut } from './components/shared/UserProfile';
import fallbackImg from './img/fallback.png';
import mailicon from './img/mail.svg';
import { PostPopup } from './components/features/posts/PostPopup';
import './components/features/posts/PostPopup.css';
import { PaperClipOutlined, CloseOutlined, FileOutlined } from '@ant-design/icons';

function BoardView() {
  const { boardPath } = useParams();
  const [boardData, setBoardData] = useState(null);
  const [boardNotFound, setBoardNotFound] = useState(false);
  const [user, setUser] = useState(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const [cards, setCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [modalColor, setModalColor] = useState("#fff");
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

  const defaultColors = useMemo(() => [
    "#FEEAA4",
    "#D4D6F9",
    "#FECFCF"
  ], []);

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*, owner:users(avatar_url)')
        .eq('url_path', boardPath)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching board:', error);
        setBoardNotFound(true);
        return;
      }

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
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!boardData?.id) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users(full_name, avatar_url, email, created_at),
        reactions(reaction_type, user_id)
      `)
      .eq('board_id', boardData.id);

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      const postsWithLikes = data.map(post => {
        const likesCount = post.reaction_counts?.like || 0;
        return {
          ...post,
          likesCount,
          author: post.author || {
            full_name: 'Anonymous',
            avatar_url: null,
            email: null,
            created_at: null
          }
        };
      });

      const sortedPosts = postsWithLikes.sort((a, b) => b.likesCount - a.likesCount);
      setCards(sortedPosts);
      setTotalPosts(sortedPosts.length);
    }
  }, [boardData]);

  useEffect(() => {
    if (boardData) {
      fetchPosts();
    }
  }, [boardData, fetchPosts]);

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
            author:users(full_name, avatar_url),
            reactions(reaction_type, user_id)
          `)
          .eq('id', payload.new.id)
          .single();

        if (newPost) {
          setCards(prev => [
            ...prev,
            {
              ...newPost,
              likesCount: newPost.reactions.filter(r => r.reaction_type === 'like').length,
              isNew: true
            }
          ]);
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

        setPostFileList([...postFileList, ...files]);
        message.success(`${files.length} file(s) attached`);
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
    
    // Clean up file previews
    postFileList.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
  };

  const handlePostSubmit = async () => {
    if (newPostContent.trim() && newPostTitle.trim()) {
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
      } else if (data && data.length > 0) {
        // Initialize reactions as an empty array
        const newPost = {
          ...data[0],
          author: {
            full_name: user.user_metadata.full_name,
            avatar_url: user.user_metadata.avatar_url
          },
          reactions: []
        };
        setCards(prevCards => [...prevCards, newPost]);
        setTotalPosts(prev => prev + 1);
        setTotalRequests(prev => prev + 1);
        handleModalClose();
      } else {
        console.error('No data returned from insert operation');
      }
    }
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

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting post:', error);
      } else {
        // Update local state only after successful deletion
        setCards(cards.filter(card => card.id !== id));
        setTotalPosts(prev => prev - 1);
        setTotalRequests(prev => prev - 1);
      }
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
    setSelectedPost(post);
  };

  // Added function to update likes in the board view from a post popup
  const handlePostLikeUpdate = (postId, newLikeCount, isLiked) => {
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
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({
        ...selectedPost,
        likesCount: newLikeCount,
        reactions: isLiked
          ? [...(selectedPost.reactions || []), { user_id: user?.id, reaction_type: 'like' }]
          : (selectedPost.reactions || []).filter(r => !(r.user_id === user?.id && r.reaction_type === 'like'))
      });
    }
  };

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
              >
                <PaperClipOutlined />
              </button>
              <div className="modal-footer-right">
                <span className="char-count">{`${newPostContent.length}/300`}</span>
                <button
                  className="post-button"
                  onClick={handlePostSubmit}
                  disabled={!newPostContent.trim() || !newPostTitle.trim()}
                >
                  Request
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
          <p>Prysm is still in private beta.</p>
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
              <img
                src={contactCardData.is_anonymous && !isBoardOwner ? fallbackImg : contactCardData.author?.avatar_url || fallbackImg}
                alt="Profile"
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
          onClose={() => setSelectedPost(null)}
          currentUser={user}
          onLikeUpdate={handlePostLikeUpdate}
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
          <Route path="/" element={<HomePage />} />
          <Route path="/:boardPath" element={<BoardView />} />
          <Route path="/mention-test" element={<MentionTest />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Analytics />
      </Router>
    </>
  );
}

export default App;

