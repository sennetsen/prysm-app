// cursor version

import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import RequestCard from "./components/RequestCard";
import "./App.css";

function App() {
  const [cards, setCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [modalColor, setModalColor] = useState("#fff");
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const [isQuestionPopupOpen, setIsQuestionPopupOpen] = useState(false);

  const colors = ["#d5dcfa", "#feeaa5", "#FFCFCF"];

  const handlePostItClick = () => {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setModalColor(randomColor);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewPostContent("");
    setNewPostTitle("");
  };

  const handlePostSubmit = () => {
    if (newPostContent.trim() && newPostTitle.trim()) {
      setCards((prevCards) => [
        ...prevCards,
        {
          id: prevCards.length + 1,
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          isAnonymous,
          color: modalColor,
        },
      ]);
      handleModalClose();
    }
  };

  const handleProfileClick = () => {
    setIsProfilePopupOpen(!isProfilePopupOpen);
    setIsQuestionPopupOpen(false);
  };

  const handleQuestionClick = () => {
    setIsQuestionPopupOpen(!isQuestionPopupOpen);
    setIsProfilePopupOpen(false);
  };

  const handleOutsideClick = (e) => {
    if (!e.target.closest('.profile-popup') && !e.target.closest('.question-popup') && !e.target.closest('.profile-icon') && !e.target.closest('.question-icon')) {
      setIsProfilePopupOpen(false);
      setIsQuestionPopupOpen(false);
    }
  };

  const handleDelete = (id) => {
    setCards(cards.filter(card => card.id !== id));
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
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
      <Navbar onProfileClick={handleProfileClick} onQuestionClick={handleQuestionClick} />
      <div className="main-content">
        <Sidebar />
        <div className="board">
          {cards.length === 0 ? (
            <p className="empty-board-message">No notes yet. Click the button to add one!</p>
          ) : (
            cards.map((card) => (
              <RequestCard
                key={card.id}
                id={card.id}
                title={card.title}
                content={card.content}
                isAnonymous={card.isAnonymous}
                color={card.color}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <button className="create-post-it-button" onClick={handlePostItClick}>
        +
      </button>

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

export default App;

