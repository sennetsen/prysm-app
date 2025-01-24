// cursor version

import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from "react-router-dom";
import { supabase, GoogleSignInButton } from "./supabaseClient";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import RequestCard from "./components/RequestCard";
import "./App.css";

// HomePage component
function HomePage() {
  return (
    <div className="app">
      <h1>Welcome to Atarea</h1>
      {/* Add your homepage content here */}
    </div>
  );
}

// BoardView component
function BoardView() {
  const { boardPath } = useParams();
  const [boardData, setBoardData] = useState(null);
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [modalColor, setModalColor] = useState("#fff");
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [isQuestionPopupOpen, setIsQuestionPopupOpen] = useState(false);
  const [isBoardOwner, setIsBoardOwner] = useState(false);

  const colors = ["#d5dcfa", "#feeaa5", "#FFCFCF"];

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('url_path', boardPath)
        .single();

      if (error) {
        console.error('Error fetching board:', error);
        return;
      }

      setBoardData(data);
      setIsBoardOwner(user?.id === data.owner_id);
    };

    if (boardPath) {
      fetchBoardData();
    }
  }, [boardPath, user]);

  // Your existing useEffect for auth
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
        return { ...post, likesCount };
      });

      const sortedPosts = postsWithLikes.sort((a, b) => b.likesCount - a.likesCount);
      setCards(sortedPosts);
    }
  }, [boardData]);

  useEffect(() => {
    if (boardData) {
      fetchPosts();
    }
  }, [boardData, fetchPosts]);

  // Add your other existing functions here (handleDelete, handleSubmit, etc.)
  const handleProfileClick = () => {
    setIsProfilePopupOpen(!isProfilePopupOpen);
    setIsQuestionPopupOpen(false);
  };

  const handleQuestionClick = () => {
    setIsQuestionPopupOpen(!isQuestionPopupOpen);
    setIsProfilePopupOpen(false);
  };

  const canAddPost = user && (isBoardOwner || !isBoardOwner);

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
    }
  };

  const handleLike = async (postId, isCurrentlyLiked) => {
    if (!user) return;

    try {
      if (isCurrentlyLiked) {
        // Remove existing like
        const { error } = await supabase
          .from('reactions')
          .delete()
          .match({
            post_id: postId,
            user_id: user.id,
            reaction_type: 'like'
          });

        if (error) throw error;
      } else {
        // Add new like
        const { error } = await supabase
          .from('reactions')
          .insert([{
            post_id: postId,
            user_id: user.id,
            reaction_type: 'like'
          }]);

        if (error) throw error;
      }

      // Refresh posts after reaction change
      fetchPosts();
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

  return (
    <div className="app">
      <Navbar
        onProfileClick={handleProfileClick}
        onQuestionClick={handleQuestionClick}
      />
      <div className="main-content">
        <Sidebar />
        <div className="board">
          {canAddPost && (
            <button onClick={handlePostItClick} className="create-post-it-button">
              +
            </button>
          )}
          {cards.map((card) => (
            <RequestCard
              key={card.id}
              id={card.id}
              title={card.title}
              content={card.content}
              isAnonymous={card.isAnonymous}
              color={card.color}
              onDelete={handleDelete}
              authorId={card.author_id}
              created_at={card.created_at}
              author={card.author}
              currentUserId={user?.id}
              isBoardOwner={isBoardOwner}
              onLike={handleLike}
            />
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal post-it-modal" style={{ backgroundColor: modalColor }}>
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
                if (e.target.value.length <= 350) {
                  setNewPostContent(e.target.value);
                }
              }}
              className="content-input"
            ></textarea>
            <div className="modal-footer">
              <label>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={() => setIsAnonymous(!isAnonymous)}
                />
                Hide my name
              </label>
              <span className="char-count">{`${newPostContent.length}/350`}</span>
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
          <h2>Hello, NAME!</h2>
          <p>Requests Made: XX</p>
          <p>Joined Jan 12, 2025</p>
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
    </div>
  );
}

// Main App component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:boardPath" element={<BoardView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

