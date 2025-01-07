// import React, { useState } from "react";
// import Navbar from "./components/Navbar";
// import VerticalNav from "./components/VerticalNav";
// import RequestCard from "./components/RequestCard";
// import "./App.css";

// function App() {
//   const [cards, setCards] = useState([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [newPostContent, setNewPostContent] = useState("");
//   const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Track sidebar visibility

//   const handlePostItClick = () => {
//     setIsModalOpen(true);
//   };

//   const handlePostSubmit = () => {
//     if (newPostContent.trim()) {
//       setCards((prevCards) => [
//         ...prevCards,
//         { id: prevCards.length + 1, content: newPostContent.trim() },
//       ]);
//       setNewPostContent("");
//       setIsModalOpen(false);
//     }
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setNewPostContent("");
//   };

//   const toggleSidebar = () => {
//     setIsSidebarVisible(!isSidebarVisible);
//   };

//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <div className={`sidebar ${isSidebarVisible ? "visible" : "hidden"}`}>
//           <div className="sidebar-content">
//             <h2>XYZ Creator ✅</h2>
//             <p>Brief bio (like Instagram?) lorem ipsum dolor sit amet</p>
//           </div>
//           <button className="toggle-button" onClick={toggleSidebar}>
//             {isSidebarVisible ? "⭠" : "⭢"}
//           </button>
//         </div>
//         <div className="board">
//           {cards.length === 0 ? (
//             <p className="empty-board-message">
//               No notes yet. Click the button to add one!
//             </p>
//           ) : (
//             cards.map((card) => (
//               <RequestCard key={card.id} content={card.content} />
//             ))
//           )}
//         </div>
//         <VerticalNav onPostItClick={handlePostItClick} />
//       </div>

//       {/* {isModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal">
//             <textarea
//               placeholder="Type your note here..."
//               value={newPostContent}
//               onChange={(e) => setNewPostContent(e.target.value)}
//             ></textarea>
//             <div className="modal-buttons">
//               <button onClick={handleModalClose}>Cancel</button>
//               <button onClick={handlePostSubmit}>Post</button>
//             </div>
//           </div>
//         </div>
//       )} */
//       isModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal post-it-modal">
//             {/* The textarea styled as a post-it */}
//             <div className="post-it-textbox">
//               <textarea
//                 placeholder="Type your note here..."
//                 value={newPostContent}
//                 onChange={(e) => setNewPostContent(e.target.value)}
//               ></textarea>
//             </div>
      
//             {/* Cancel and Post buttons positioned in the bottom-right */}
//             <div className="modal-buttons">
//               <button className="cancel-button" onClick={handleModalClose}>
//                 Cancel
//               </button>
//               <button className="post-button" onClick={handlePostSubmit}>
//                 Post
//               </button>
//             </div>
//           </div>
//         </div>
//       )
      
      
      
      
//       }
//     </div>
//   );
// }

// export default App;


// timestamps

// import React, { useState } from "react";
// import Navbar from "./components/Navbar";
// import VerticalNav from "./components/VerticalNav";
// import RequestCard from "./components/RequestCard";
// import "./App.css";

// function App() {
//   const [cards, setCards] = useState([]); // Stores all post-its
//   const [isModalOpen, setIsModalOpen] = useState(false); // Tracks modal visibility
//   const [newPostContent, setNewPostContent] = useState(""); // Tracks input in modal
//   const [postItColor, setPostItColor] = useState("#FEF3C7"); // Default color for post-its

//   const colors = ["#FEF3C7", "#DBEAFE", "#FEE2E2"]; // Post-it color options

//   // Open the modal and randomly select a color
//   const handlePostItClick = () => {
//     const randomColor = colors[Math.floor(Math.random() * colors.length)];
//     setPostItColor(randomColor); // Set the random color
//     setIsModalOpen(true); // Open the modal
//   };

//   // Add a new post-it with content, color, and timestamp
//   const handlePostSubmit = () => {
//     if (newPostContent.trim()) {
//       const currentTime = new Date();
//       const timestamp = `${currentTime.getHours()}:${String(
//         currentTime.getMinutes()
//       ).padStart(2, "0")}`; // Format hour:minute

//       setCards((prevCards) => [
//         ...prevCards,
//         {
//           id: prevCards.length + 1,
//           content: newPostContent.trim(),
//           color: postItColor,
//           timestamp: timestamp, // Add the timestamp
//         },
//       ]);
//       setNewPostContent(""); // Clear the input
//       setIsModalOpen(false); // Close the modal
//     }
//   };

//   // Close the modal without adding a post-it
//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setNewPostContent(""); // Clear the input
//   };

//   return (
//     <div className="app">
//       <Navbar />

  


//       <div className="main-content">
//         <div className="board">
//           {cards.length === 0 ? (
//             <p className="empty-board-message">No notes yet. Click the button to add one!</p>
//           ) : (
//             cards.map((card) => (
//               <RequestCard
//                 key={card.id}
//                 content={card.content}
//                 color={card.color}
//                 timestamp={card.timestamp} // Pass timestamp to RequestCard
//               />
//             ))
//           )}
//         </div>
//         <VerticalNav onPostItClick={handlePostItClick} />
//       </div>

//       {/* Modal for creating a new post-it */}
//       {isModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal post-it-modal" style={{ backgroundColor: postItColor }}>
//             <textarea
//               placeholder="Type your note here..."
//               value={newPostContent}
//               onChange={(e) => setNewPostContent(e.target.value)}
//               style={{ backgroundColor: postItColor }}
//             ></textarea>
//             <div className="modal-buttons">
//               <button className="cancel-button" onClick={handleModalClose}>
//                 Cancel
//               </button>
//               <button className="post-button" onClick={handlePostSubmit}>
//                 Post
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;





// import React, { useState } from "react";
// import Navbar from "./components/Navbar";
// import VerticalNav from "./components/VerticalNav";
// import RequestCard from "./components/RequestCard";
// import Sidebar from "./components/Sidebar"; // Include the Sidebar component
// import "./App.css";

// function App() {
//   const [cards, setCards] = useState([]); // Stores all post-its
//   const [isModalOpen, setIsModalOpen] = useState(false); // Tracks modal visibility
//   const [newPostContent, setNewPostContent] = useState(""); // Tracks input in modal
//   const [postItColor, setPostItColor] = useState("#FEF3C7"); // Default color for post-its

//   const colors = ["#FEF3C7", "#DBEAFE", "#FEE2E2"]; // Post-it color options

//   // Open the modal and randomly select a color
//   const handlePostItClick = () => {
//     const randomColor = colors[Math.floor(Math.random() * colors.length)];
//     setPostItColor(randomColor); // Set the random color
//     setIsModalOpen(true); // Open the modal
//   };

//   // Add a new post-it with content, color, and timestamp
//   const handlePostSubmit = () => {
//     if (newPostContent.trim()) {
//       const currentTime = new Date();
//       const timestamp = `${currentTime.getHours()}:${String(
//         currentTime.getMinutes()
//       ).padStart(2, "0")}`; // Format hour:minute

//       setCards((prevCards) => [
//         ...prevCards,
//         {
//           id: prevCards.length + 1,
//           content: newPostContent.trim(),
//           color: postItColor,
//           timestamp: timestamp, // Add the timestamp
//         },
//       ]);
//       setNewPostContent(""); // Clear the input
//       setIsModalOpen(false); // Close the modal
//     }
//   };

//   // Close the modal without adding a post-it
//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setNewPostContent(""); // Clear the input
//   };

//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <Sidebar /> {/* Sidebar component is included here */}
//         <div className="board">
//           {cards.length === 0 ? (
//             <p className="empty-board-message">No notes yet. Click the button to add one!</p>
//           ) : (
//             cards.map((card) => (
//               <RequestCard
//                 key={card.id}
//                 content={card.content}
//                 color={card.color}
//                 timestamp={card.timestamp} // Pass timestamp to RequestCard
//               />
//             ))
//           )}
//         </div>
//         <VerticalNav onPostItClick={handlePostItClick} />
//       </div>

//       {/* Modal for creating a new post-it */}
//       {isModalOpen && (
//         <div className="modal-overlay">
//           <div className="modal post-it-modal" style={{ backgroundColor: postItColor }}>
//             <textarea
//               placeholder="Type your note here..."
//               value={newPostContent}
//               onChange={(e) => setNewPostContent(e.target.value)}
//               style={{ backgroundColor: postItColor }}
//             ></textarea>
//             <div className="modal-buttons">
//               <button className="cancel-button" onClick={handleModalClose}>
//                 Cancel
//               </button>
//               <button className="post-button" onClick={handlePostSubmit}>
//                 Post
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;





import React, { useState } from "react";
import Navbar from "./components/Navbar";
import VerticalNav from "./components/VerticalNav";
import RequestCard from "./components/RequestCard";
import Sidebar from "./components/Sidebar";
import "./App.css";

function App() {
  const [cards, setCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [postItColor, setPostItColor] = useState("#FEF3C7");

  const colors = ["#FEF3C7", "#DBEAFE", "#FEE2E2"];

  const handlePostItClick = () => {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setPostItColor(randomColor);
    setIsModalOpen(true);
  };

  const handlePostSubmit = () => {
    if (newPostContent.trim()) {
      const currentTime = new Date();
      const hours = currentTime.getHours() % 12 || 12; // Convert to 12-hour format
      const minutes = String(currentTime.getMinutes()).padStart(2, "0");
      const ampm = currentTime.getHours() >= 12 ? "PM" : "AM";
      const timestamp = `${hours}:${minutes} ${ampm}`;

      setCards((prevCards) => [
        ...prevCards,
        {
          id: prevCards.length + 1,
          content: newPostContent.trim(),
          color: postItColor,
          timestamp: timestamp,
          likes: 0,
        },
      ]);
      setNewPostContent("");
      setIsModalOpen(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewPostContent("");
  };

  const handleLike = (id) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === id ? { ...card, likes: card.likes + 1 } : card
      )
    );
  };

  const handleDelete = (id) => {
    setCards((prevCards) => prevCards.filter((card) => card.id !== id));
  };

  return (
    <div className="app">
      <Navbar />
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
                content={card.content}
                color={card.color}
                timestamp={card.timestamp}
                likes={card.likes}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
        <VerticalNav onPostItClick={handlePostItClick} />
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal post-it-modal" style={{ backgroundColor: postItColor }}>
            <textarea
              placeholder="Type your note here..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              style={{ backgroundColor: postItColor }}
            ></textarea>
            <div className="modal-buttons">
              <button className="cancel-button" onClick={handleModalClose}>
                Cancel
              </button>
              <button className="post-button" onClick={handlePostSubmit}>
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
