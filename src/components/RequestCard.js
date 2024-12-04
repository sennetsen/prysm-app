import React from "react";
import "./RequestCard.css";

function RequestCard({ content }) {
  return (
    <div className="request-card">
      <p>{content}</p>
    </div>
  );
}

export default RequestCard;
