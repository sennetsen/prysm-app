import React, { useState } from "react";
import Navbar from "./components/Navbar";
import VerticalNav from "./components/VerticalNav";
import RequestCard from "./components/RequestCard";
import "./App.css";

function App() {
  const [cards, setCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Track sidebar visibility

  const handlePostItClick = () => {
    setIsModalOpen(true);
  };

  const handlePostSubmit = () => {
    if (newPostContent.trim()) {
      setCards((prevCards) => [
        ...prevCards,
        { id: prevCards.length + 1, content: newPostContent.trim() },
      ]);
      setNewPostContent("");
      setIsModalOpen(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewPostContent("");
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible); // Toggle sidebar visibility
  };

  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <div className={`sidebar ${isSidebarVisible ? "visible" : "hidden"}`}>
          <div className="sidebar-content">
            <h2>XYZ Creator ✅</h2>
            <p>Brief bio (like Instagram?) lorem ipsum dolor sit amet</p>
          </div>
          <button className="toggle-button" onClick={toggleSidebar}>
            {isSidebarVisible ? "⭠" : "⭢"}
          </button>
        </div>
        <div className="board">
          {cards.length === 0 ? (
            <p className="empty-board-message">
              No notes yet. Click the button to add one!
            </p>
          ) : (
            cards.map((card) => (
              <RequestCard key={card.id} content={card.content} />
            ))
          )}
        </div>
        <VerticalNav onPostItClick={handlePostItClick} />
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <textarea
              placeholder="Type your note here..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            ></textarea>
            <div className="modal-buttons">
              <button onClick={handleModalClose}>Cancel</button>
              <button onClick={handlePostSubmit}>Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
