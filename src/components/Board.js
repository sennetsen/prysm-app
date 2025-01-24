import React, { useState, useEffect } from "react";
import RequestCard from "./RequestCard";
import "./Board.css";
import { supabase } from "../supabaseClient";

function Board({ boardId }) {
  const [posts, setPosts] = useState([]);
  const [boardData, setBoardData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);

        // Fetch board data
        const { data: board, error: boardError } = await supabase
          .from("boards")
          .select("*, owner:users(*)")
          .eq("id", boardId)
          .single();

        if (!boardError) {
          setBoardData(board);
        }

        // Fetch posts with author_id explicitly
        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select(`
            id,
            title,
            content,
            is_anonymous,
            color,
            created_at,
            author_id,
            reactions(*)
          `)
          .eq("board_id", boardId);

        if (!postsError) {
          console.log("Fetched Posts:", posts);
          setPosts(posts);
        }
      }
    };

    fetchBoardData();
  }, [boardId]);

  if (!boardData || !currentUser) return <div>Loading...</div>;

  return (
    <div className="board">
      {posts.map((post) => (
        <RequestCard
          key={post.id}
          id={post.id}
          title={post.title}
          content={post.content}
          isAnonymous={post.is_anonymous}
          color={post.color}
          onDelete={() => handleDelete(post.id)}
          authorId={post.author_id} // Pass author_id directly
          created_at={post.created_at}
          currentUserId={currentUser.id}
          isBoardOwner={boardData.owner_id === currentUser.id}
        />
      ))}
    </div>
  );
}

export default Board;
