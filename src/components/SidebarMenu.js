// import React, { useState } from 'react';
// import Board from './Board';
// import './SidebarMenu.css';

// function SidebarMenu() {
//   const [selectedOption, setSelectedOption] = useState(2); // Default to 2nd option

//   const handleOptionClick = (option) => {
//     setSelectedOption(option);
//   };

//   return (
//     <div className="sidebar-menu">
//       <div
//         className={`menu-option ${selectedOption === 1 ? 'active' : ''}`}
//         onClick={() => handleOptionClick(1)}
//       >
//         Option 1
//       </div>
//       <div
//         className={`menu-option ${selectedOption === 2 ? 'active' : ''}`}
//         onClick={() => handleOptionClick(2)}
//       >
//         Option 2
//       </div>
//       <div
//         className={`menu-option ${selectedOption === 3 ? 'active' : ''}`}
//         onClick={() => handleOptionClick(3)}
//       >
//         Option 3
//       </div>
//       <div
//         className={`menu-option ${selectedOption === 4 ? 'active' : ''}`}
//         onClick={() => handleOptionClick(4)}
//       >
//         Option 4
//       </div>

//       <div className="content-area">
//         {selectedOption === 2 ? <Board /> : <div className="placeholder">Blank Page</div>}
//       </div>
//     </div>
//   );
// }

// export default SidebarMenu;
