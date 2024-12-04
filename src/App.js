import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import VerticalNav from "./components/VerticalNav";
import RequestCard from "./components/RequestCard";
import "./App.css";

function App() {
  const [cards, setCards] = useState([]); // Store post-it notes
  const [isModalOpen, setIsModalOpen] = useState(false); // Control modal visibility
  const [newPostContent, setNewPostContent] = useState(""); // Content for the new post-it

  // Open the modal
  const handlePostItClick = () => {
    setIsModalOpen(true);
  };

  // Add a new post-it with content from the modal
  const handlePostSubmit = () => {
    if (newPostContent.trim()) {
      setCards((prevCards) => [
        ...prevCards,
        { id: prevCards.length + 1, content: newPostContent.trim() },
      ]);
      setNewPostContent(""); // Clear input
      setIsModalOpen(false); // Close modal
    }
  };

  // Close the modal without adding a post-it
  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewPostContent(""); // Clear input
  };

  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <Sidebar /> {/* Sidebar is now included */}
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

      {/* Modal for creating a new post-it */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <textarea
              placeholder="Type your note here..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)} // Update content state
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
