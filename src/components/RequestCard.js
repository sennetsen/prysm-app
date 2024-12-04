import React from 'react';
import './RequestCard.css';

function RequestCard() {
  return (
    <div className="request-card">
      <h3 className="request-title">Request title</h3>
      <p className="request-description">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <div className="request-footer">
        <span className="username">Username</span>
        <span className="likes">❤️ 20</span>
        <span className="comments">💬 15</span>
      </div>
    </div>
  );
}

export default RequestCard;


// import React from 'react';
// import './RequestCard.css';

// function RequestCard({ content }) {
//   return (
//     <div className="request-card">
//       <p>{content}</p>
//     </div>
//   );
// }

// export default RequestCard;
