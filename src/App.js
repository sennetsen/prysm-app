import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import RequestCard from "./components/RequestCard";
import "./App.css";
import { Button, Checkbox, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { lightenColor } from './utils/colorUtils'; // Import the lightenColor function
import { GoogleSignInButton } from './supabaseClient';

// HomePage component
function HomePage() {
  return (
    <div className="app">
      <h1>Welcome to Prysm</h1>
      {/* Add your homepage content here */}
    </div>
  );
}

// BoardView component
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
  const [navbarColor, setNavbarColor] = useState('#b43144'); // Default color
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [isJoinPopupOpen, setIsJoinPopupOpen] = useState(false);

  const colors = [
    "#FEEAA4",
    "#D4D6F9",
    "#FECFCF"

    // "#FFC107",  
    // "#8000204D",   
    // "#7080904D" 
  ];

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
      setIsBoardOwner(user?.id === data.owner_id);
    };

    if (boardPath) {
      fetchBoardData();
    }
  }, [boardPath]);

  useEffect(() => {
    if (boardData?.creator_name) {
      document.title = `${boardData.creator_name}'s Board | Prysm`;
    } else {
      document.title = "Creator Board";
    }
  }, [boardData?.creator_name]);

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

  // Your existing fetchPosts function
  const fetchPosts = useCallback(async () => {
    if (!boardData?.id) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users(full_name, avatar_url),
        reactions(reaction_type, user_id)
      `)
      .eq('board_id', boardData.id);

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      const postsWithLikes = data.map(post => {
        const likesCount = post.reactions.filter(r => r.reaction_type === 'like').length;
        return {
          ...post,
          likesCount,
          author: {
            ...post.author,
            avatar_url: post.author?.avatar_url || null
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
              likesCount: newPost.reactions.filter(r => r.reaction_type === 'like').length
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
        setCards(prev => prev.filter(card => card.id !== payload.old.id));
        setTotalPosts(prev => prev - 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsSubscription);
    };
  }, [boardData?.id]);

  // Add your other existing functions here (handleDelete, handleSubmit, etc.)
  const handleProfileClick = () => {
    setIsProfilePopupOpen(!isProfilePopupOpen);
    setIsQuestionPopupOpen(false);
  };

  const handleQuestionClick = () => {
    setIsQuestionPopupOpen(!isQuestionPopupOpen);
    setIsProfilePopupOpen(false);
  };

  const canAddPost = user;

  const handlePostItClick = () => {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setModalColor(randomColor);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewPostContent("");
    setNewPostTitle("");
    setIsAnonymous(false);
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
        // Update the posts state with the new post
        setCards(prevCards => [...prevCards, { ...data[0], author: { full_name: user.user_metadata.full_name, avatar_url: user.user_metadata.avatar_url } }]);
        setTotalPosts(prev => prev + 1);
        handleModalClose(); // Close the modal after successful submission
      } else {
        console.error('No data returned from insert operation');
      }
    }
  };

  const handleOutsideClick = (e) => {
    if (!e.target.closest('.profile-popup') && !e.target.closest('.question-popup') && !e.target.closest('.profile-icon') && !e.target.closest('.question-icon')) {
      setIsProfilePopupOpen(false);
      setIsQuestionPopupOpen(false);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting post:', error);
    } else {
      setCards(cards.filter(card => card.id !== id));
      setTotalPosts(prev => prev - 1);
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
      }

      // Update local state without sorting
      setCards(prevCards => prevCards.map(card => {
        if (card.id === postId) {
          const newLikesCount = isCurrentlyLiked ? card.likesCount - 1 : card.likesCount + 1;
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
    if (isProfilePopupOpen || isQuestionPopupOpen) {
      document.addEventListener('click', handleOutsideClick);
    } else {
      document.removeEventListener('click', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isProfilePopupOpen, isQuestionPopupOpen]);

  useEffect(() => {
    if (navbarColor) {
      const lightShade = lightenColor(navbarColor, 75); // Lighten by 75%
      setBackgroundColor(lightShade);
    }
  }, [navbarColor]);
  const handleJoinClick = () => {
    setIsJoinPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsJoinPopupOpen(false);
  };

  return (
    <div className="app" style={{ backgroundColor }}>
      <Navbar
        onProfileClick={handleProfileClick}
        onQuestionClick={handleQuestionClick}
        title={boardData?.title}
        color={navbarColor}
        onJoinClick={handleJoinClick}
      />
      <div className="main-content">
        <Sidebar
          description={boardData?.description}
          bio={boardData?.bio}
          totalPosts={totalPosts}
          creatorName={boardData?.creator_name}
          avatarUrl={boardData?.owner?.avatar_url}
          posts={cards}
          color={boardData?.color}
        />
        <div className="board">
          {cards.length === 0 && (
            <p className="empty-board-message">No posts yet. Click the button to add one!</p>
          )}
          {cards.map((card) => (
            <RequestCard
              key={card.id}
              id={card.id}
              title={card.title}
              content={card.content}
              isAnonymous={card.is_anonymous}
              color={card.color}
              onDelete={handleDelete}
              authorId={card.author_id}
              created_at={card.created_at}
              author={card.author}
              currentUserId={user?.id}
              isBoardOwner={isBoardOwner}
              onLike={handleLike}
              likesCount={card.likesCount}
              reactions={card.reactions || []}
            />
          ))}
          {canAddPost && (
            <Button
              type="primary"
              shape="circle"
              icon={<PlusOutlined style={{ fontSize: '24px', color: 'white' }} />}
              onClick={handlePostItClick}
              className="create-post-it-button"
              style={{
                backgroundColor: '#b43144',
                borderColor: '#9c2938',
                width: 50,
                height: 50,
                fontSize: '24px',
                boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal post-it-modal" style={{ backgroundColor: modalColor, opacity: 1 }}>
            <button className="close-modal-button" onClick={handleModalClose}>
              &times;
            </button>
            <h3 className="modal-title">
              <input
                type="text"
                placeholder="Request title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="title-input"
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
            <div className="modal-footer">
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
      )}

      {isProfilePopupOpen && (
        <div className="profile-popup">
          <h2>Hello, {user?.user_metadata?.name || 'Visitor'}!</h2>
          <p>Total Requests Made: {totalRequests}</p>
          {user?.created_at && (
            <p>Joined {new Date(user.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}</p>
          )}
          <button className="logout-button">Log Out</button>
        </div>
      )}

      {isQuestionPopupOpen && (
        <div className="question-popup">
          <h2>Thanks for using us!</h2>
          <p>Prysm is still in private beta.</p>
          <p>Find us at <a href="https://prysmapp.com">prysmapp.com</a></p>
          <p>or contact us at <a href="mailto:getprysm@gmail.com">getprysm@gmail.com</a></p>
          <div className="placeholder-box">[SVG Placeholder]</div>
        </div>
      )}

      {isJoinPopupOpen && (
        <div className="modal-overlay">
          <div style={{ height: '25%' }} className="post-it-modal">
            <button className="close-modal-button" onClick={handleClosePopup}>
              &times;
            </button>
            <div className="join-popup-content">
              <h2>Welcome!</h2>
              <p style={{ marginTop: '-8px' }}>Sign in or sign up to interact with this board.</p>
              <div className="google-signin-container">
                <GoogleSignInButton />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Main App component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div />} /> {/* Empty element since content is in index.html */}
        <Route path="/:boardPath" element={<BoardView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

