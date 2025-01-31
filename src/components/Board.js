import React, { useState, useEffect } from "react";
import RequestCard from "./RequestCard";
import "./Board.css";
import { supabase } from "../supabaseClient";
import Sidebar from "./Sidebar";

function Board({ boardId }) {
  const [posts, setPosts] = useState([]);
  const [boardData, setBoardData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // useEffect(() => {
  //   const fetchBoardData = async () => {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     if (session) {
  //       setCurrentUser(session.user);

  //       // Fetch board data including creator_name and avatar_url
  //       const { data: board, error: boardError } = await supabase
  //         .from("boards")
  //         .select("*, owner:users(avatar_url)")
  //         .eq("id", boardId)
  //         .single();

  //       if (!boardError) {
  //         setBoardData(board);
  //       }

  //       // Fetch posts with author_id explicitly
  //       const { data: posts, error: postsError } = await supabase
  //         .from("posts")
  //         .select(`
  //           id,
  //           title,
  //           content,
  //           is_anonymous,
  //           color,
  //           created_at,
  //           author_id,
  //           reactions(*)
  //         `)
  //         .eq("board_id", boardId);

  //       if (!postsError) {
  //         console.log("Fetched Posts:", posts);
  //         setPosts(posts);
  //       }
  //     }
  //   };

  //   fetchBoardData();
  // }, [boardId]);

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);

        // Fetch board and posts in parallel
        const [boardResponse, postsResponse] = await Promise.all([
          supabase
            .from("boards")
            .select("*, owner:users(avatar_url)")
            .eq("id", boardId)
            .single(),
          supabase
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
            .eq("board_id", boardId)
        ]);

        if (!boardResponse.error) {
          setBoardData(boardResponse.data);
        }

        if (!postsResponse.error) {
          setPosts(postsResponse.data);
        }
      }
    };

    fetchBoardData();
  }, [boardId]);

  if (!boardData || !currentUser) {
    return (
      <div className="board">
        {Array(6).fill().map((_, i) => (
          <div key={i} className="card-skeleton" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="board">
      <Sidebar
        description={boardData?.description}
        bio={boardData?.bio}
        totalPosts={posts.length}
        creatorName={boardData?.creator_name}
        avatarUrl={boardData?.owner?.avatar_url}
      />
      {posts.map((post) => (
        <RequestCard
          key={post.id}
          id={post.id}
          title={post.title}
          content={post.content}
          isAnonymous={post.is_anonymous}
          color={post.color}
          onDelete={() => handleDelete(post.id)}
          authorId={post.author_id}
          created_at={post.created_at}
          currentUserId={currentUser.id}
          setUser={setUser}
          isBoardOwner={boardData.owner_id === currentUser.id}
        />
      ))}
    </div>
  );
}

export default Board;
