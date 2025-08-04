import React, { useState, useEffect } from "react";
import RequestCard from "../posts/RequestCard";
import "./Board.css";
import { supabase } from "../../../supabaseClient";
import Sidebar from "./Sidebar";

function Board({ boardId }) {
  const [posts, setPosts] = useState([]);
  const [boardData, setBoardData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);

        const [boardResponse, postsResponse] = await Promise.all([
          supabase
            .from("boards")
            .select("*, owner:users(avatar_url), creator_avatar")
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
              reactions(*),
              reaction_counts
            `)
            .eq("board_id", boardId)
        ]);

        if (!postsResponse.error && postsResponse.data) {
          // Fetch comment counts for each post
          const postIds = postsResponse.data.map(post => post.id);
          const { data: commentCounts } = await supabase
            .from('comments')
            .select('post_id')
            .in('post_id', postIds);

          // Calculate comment counts per post
          const commentCountsMap = {};
          if (commentCounts) {
            commentCounts.forEach(comment => {
              commentCountsMap[comment.post_id] = (commentCountsMap[comment.post_id] || 0) + 1;
            });
          }

          // Add comment counts to posts
          const postsWithCommentCounts = postsResponse.data.map(post => ({
            ...post,
            commentCount: commentCountsMap[post.id] || 0
          }));

          setPosts(postsWithCommentCounts);
        }

        if (!boardResponse.error) {
          setBoardData(boardResponse.data);
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
        creatorAvatar={boardData?.creator_avatar}
        avatarUrl={boardData?.owner?.avatar_url}
        boardId={boardId}
        currentUserId={currentUser.id}
        boardCreatorId={boardData.owner_id}
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
          commentCount={post.commentCount}
        />
      ))}
    </div>
  );
}

export default Board;
