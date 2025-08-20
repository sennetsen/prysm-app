import React, { useState, useEffect, useRef } from "react";
import RequestCard from "../posts/RequestCard";
import "./Board.css";
import { supabase } from "../../../supabaseClient";
import Sidebar from "./Sidebar";

function Board({ boardId }) {
  const [posts, setPosts] = useState([]);
  const [boardData, setBoardData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const boardRef = useRef(null);
  const masonryRef = useRef(null);

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);

        const [boardResponse, postsResponse] = await Promise.all([
          supabase
            .from("boards")
            .select("*, owner:users(avatar_url, avatar_storage_path), creator_avatar")
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



  // Initialize Masonry when posts change
  useEffect(() => {
    if (posts.length > 0 && boardRef.current && window.Masonry) {
      // Destroy existing masonry instance if it exists
      if (masonryRef.current) {
        masonryRef.current.destroy();
      }

      // Use imagesLoaded for proper image handling
      if (window.imagesLoaded) {
        window.imagesLoaded(boardRef.current, () => {
          // Initialize new masonry instance using grid-sizer element
          masonryRef.current = new window.Masonry(boardRef.current, {
            itemSelector: '.request-card',
            columnWidth: '.grid-sizer', // Use grid-sizer element for responsive sizing
            percentPosition: false, // Use pixel positioning for fixed widths
            gutter: 16,
            horizontalOrder: true, // Maintain horizontal order like Pinterest
            transitionDuration: '0.3s',
            resize: true // Enable automatic resize handling
          });


        });
      } else {
        // Fallback if imagesLoaded is not available
        masonryRef.current = new window.Masonry(boardRef.current, {
          itemSelector: '.request-card',
          columnWidth: '.grid-sizer', // Use grid-sizer element for responsive sizing
          percentPosition: false,
          gutter: 16,
          horizontalOrder: true,
          transitionDuration: '0.3s',
          resize: true
        });
      }
    }

    // Cleanup function
    return () => {
      if (masonryRef.current) {
        masonryRef.current.destroy();
        masonryRef.current = null;
      }
    };
  }, [posts]);

  // Handle window resize for Masonry
  useEffect(() => {
    const handleResize = () => {
      if (masonryRef.current) {
        masonryRef.current.layout();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!boardData || !currentUser) {
    return (
      <div className="board">
        {Array(6).fill().map((_, i) => (
          <div key={i} className="card-skeleton" />
        ))}
      </div>
    );
  }

  const handleDelete = async (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));

    // Update masonry layout after deletion
    setTimeout(() => {
      if (masonryRef.current) {
        masonryRef.current.layout();
      }
    }, 300); // Wait for animation to complete
  };

  const handleLike = (postId) => {
    // Handle like functionality
  };

  const handlePostClick = (post) => {
    // Handle post click
  };

  return (
    <div className="board-container">
      {/* Sidebar is OUTSIDE the grid container */}
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

      {/* Cards are in their own grid container */}
      <div className="board" ref={boardRef}>
        {/* Grid sizer element for Masonry column width calculation */}
        <div className="grid-sizer"></div>
        {posts.map((post, index) => {
          return (
            <RequestCard
              key={post.id}
              id={post.id}
              title={post.title}
              content={post.content}
              isAnonymous={post.is_anonymous}
              color={post.color}
              onDelete={() => handleDelete(post.id)}
              authorId={post.author_id}
              author={post.author}
              created_at={post.created_at}
              currentUserId={currentUser.id}
              isBoardOwner={boardData.owner_id === currentUser.id}
              onLike={() => handleLike(post.id)}
              likesCount={post.reaction_counts?.like || 0}
              reactions={post.reactions || []}
              index={index}
              onPostClick={handlePostClick}
              attachments={post.attachments || []}
              commentCount={post.commentCount}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Board;
