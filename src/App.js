// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;

// --------------THIS ONE --------------

// import React from 'react';
// import Navbar from './components/Navbar';
// import Sidebar from './components/Sidebar';
// import Board from './components/Board';
// import './App.css';

// function App() {
//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <Sidebar />
//         <Board />
//       </div>
//     </div>
//   );
// }

// export default App;

// import React from 'react';
// import Navbar from './components/Navbar';
// import SidebarMenu from './components/SidebarMenu';
// import './App.css';

// function App() {
//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <SidebarMenu />
//       </div>
//     </div>
//   );
// }

// export default App;



// import React, { useState } from 'react';
// import Navbar from './components/Navbar';
// import Sidebar from './components/Sidebar';
// import VerticalNav from './components/VerticalNav';
// import RequestCard from './components/RequestCard';
// import './App.css';

// function App() {
//   const [cards, setCards] = useState([
//     { id: 1 },
//     { id: 2 },
//     { id: 3 },
//   ]); // Initial cards

//   const handlePostItClick = () => {
//     // Add a new card with a unique ID
//     setCards((prevCards) => [...prevCards, { id: prevCards.length + 1 }]);
//   };

//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <Sidebar /> {/* Sidebar on the left */}
//         <div className="center-content">
//           <div className="board">
//             {cards.map((card) => (
//               <RequestCard key={card.id} />
//             ))}
//           </div>
//         </div>
//         <VerticalNav onPostItClick={handlePostItClick} /> {/* Vertical nav on the right */}
//       </div>
//     </div>
//   );
// }

// export default App;


// import React, { useState } from 'react';
// import Navbar from './components/Navbar';
// import Sidebar from './components/Sidebar';
// import VerticalNav from './components/VerticalNav';
// import RequestCard from './components/RequestCard';
// import './App.css';

// function App() {
//   const [cards, setCards] = useState([
//     { id: 1, content: "Sample Note 1" },
//     { id: 2, content: "Sample Note 2" },
//     { id: 3, content: "Sample Note 3" },
//   ]); // Initial cards
//   const [isModalOpen, setIsModalOpen] = useState(false); // Controls modal visibility
//   const [newPostContent, setNewPostContent] = useState(''); // Stores input for new post

//   const handlePostItClick = () => {
//     setIsModalOpen(true); // Open the modal
//   };

//   const handlePostSubmit = () => {
//     if (newPostContent.trim()) {
//       setCards((prevCards) => [
//         ...prevCards,
//         { id: prevCards.length + 1, content: newPostContent.trim() },
//       ]);
//       setNewPostContent(''); // Clear the input
//       setIsModalOpen(false); // Close the modal
//     }
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false); // Close the modal without posting
//     setNewPostContent(''); // Clear the input
//   };

//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <Sidebar /> {/* Sidebar on the left */}
//         <div className="center-content">
//           <div className="board">
//             {cards.map((card) => (
//               <RequestCard key={card.id} content={card.content} />
//             ))}
//           </div>
//         </div>
//         <VerticalNav onPostItClick={handlePostItClick} /> {/* Vertical nav on the right */}
//       </div>

//       {isModalOpen && (
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
//       )}
//     </div>
//   );
// }

// export default App;


// import React, { useState } from 'react';
// import Navbar from './components/Navbar';
// import Sidebar from './components/Sidebar';
// import VerticalNav from './components/VerticalNav';
// import RequestCard from './components/RequestCard';
// import './App.css';

// function App() {
//   const [cards, setCards] = useState([]); // Start with no cards
//   const [isModalOpen, setIsModalOpen] = useState(false); // Controls modal visibility
//   const [newPostContent, setNewPostContent] = useState(''); // Stores input for new post

//   const handlePostItClick = () => {
//     setIsModalOpen(true); // Open the modal
//   };

//   const handlePostSubmit = () => {
//     if (newPostContent.trim()) {
//       setCards((prevCards) => [
//         ...prevCards,
//         { id: prevCards.length + 1, content: newPostContent.trim() },
//       ]);
//       setNewPostContent(''); // Clear the input
//       setIsModalOpen(false); // Close the modal
//     }
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false); // Close the modal without posting
//     setNewPostContent(''); // Clear the input
//   };

//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <Sidebar /> {/* Sidebar on the left */}
//         <div className="center-content">
//           <div className="board">
//             {cards.length === 0 ? (
//               <p className="empty-board-message">No notes yet. Click the button to add one!</p>
//             ) : (
//               cards.map((card) => <RequestCard key={card.id} content={card.content} />)
//             )}
//           </div>
//         </div>
//         <VerticalNav onPostItClick={handlePostItClick} /> {/* Vertical nav on the right */}
//       </div>

//       {isModalOpen && (
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
//       )}
//     </div>
//   );
// }

// export default App;


// import React, { useState } from "react";
// import Navbar from "./components/Navbar";
// import Sidebar from "./components/Sidebar";
// import VerticalNav from "./components/VerticalNav";
// import RequestCard from "./components/RequestCard";
// import "./App.css";

// function App() {
//   const [cards, setCards] = useState([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [newPostContent, setNewPostContent] = useState("");

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

//   return (
//     <div className="app">
//       <Navbar />
//       <div className="main-content">
//         <Sidebar />
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

//       {isModalOpen && (
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
//       )}
//     </div>
//   );
// }

// export default App;




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
