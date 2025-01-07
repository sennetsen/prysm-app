// import React from "react";
// import "./RequestCard.css";

// function RequestCard({ content }) {
//   return (
//     <div className="request-card">
//       <p>{content}</p>
//     </div>
//   );
// }

// export default RequestCard;

// import React from "react";
// import "./RequestCard.css";

// function RequestCard({ content, color }) {
//   return (
//     <div className="request-card" style={{ backgroundColor: color }}>
//       <p>{content}</p>
//     </div>
//   );
// }

// export default RequestCard;


// import React from "react";
// import "./RequestCard.css";

// function RequestCard({ content, color, timestamp }) {
//   return (
//     <div className="request-card" style={{ backgroundColor: color }}>
//       <p>{content}</p>
//       <div className="timestamp">{timestamp}</div>
//     </div>
//   );
// }

// export default RequestCard;



import React from "react";
import "./RequestCard.css";

function RequestCard({ id, content, color, timestamp, likes, onLike, onDelete }) {
  return (
    <div className="request-card" style={{ backgroundColor: color }}>
      <button className="delete-button" onClick={() => onDelete(id)}>
        &times;
      </button>
      <p>{content}</p>
      <div className="card-footer">
        <span className="timestamp">{timestamp}</span>
        <div className="like-section">
          <button className="like-button" onClick={() => onLike(id)}>
            ❤️
          </button>
          <span>{likes}</span>
        </div>
      </div>
    </div>
  );
}

export default RequestCard;
