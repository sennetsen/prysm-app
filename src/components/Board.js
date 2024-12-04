import React from 'react';
import RequestCard from './RequestCard';
import './Board.css';

function Board() {
  return (
    <div className="board">
      <RequestCard />
      <RequestCard />
      <RequestCard />
      <RequestCard />
      <RequestCard />
    </div>
  );
}

export default Board;
