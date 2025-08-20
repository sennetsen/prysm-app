import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import ActivityItem, { ActivityType, Activity } from '../posts/ActivityItem';
import './BoardActivityStream.css';

interface BoardActivityStreamProps {
  boardId: string;
  currentUserId?: string;
  boardCreatorId?: string;
}

const MAX_ACTIVITIES = 50;

const BoardActivityStream: React.FC<BoardActivityStreamProps> = ({ boardId, currentUserId, boardCreatorId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const streamRef = useRef<HTMLDivElement>(null);

  // Helper to add new activity to the top, keep max length
  const pushActivity = (activity: Activity) => {
    setActivities(prev => [activity, ...prev].slice(0, MAX_ACTIVITIES));
  };

  // Load initial activities
  const loadInitialActivities = async () => {
    if (!boardId) return;

    try {
      // Fetch recent posts for this board
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, created_at, author_id')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent comments for posts in this board
      const { data: comments } = await supabase
        .from('comments')
        .select('id, content, created_at, author_id, parent_comment_id, post_id')
        .in('post_id', posts?.map(p => p.id) || [])
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent reactions for posts in this board
      const { data: reactions } = await supabase
        .from('reactions')
        .select('id, reaction_type, created_at, user_id, post_id')
        .in('post_id', posts?.map(p => p.id) || [])
        .order('created_at', { ascending: false })
        .limit(10);

      // Combine and sort all activities
      const allActivities: Activity[] = [];

      // Fetch user data for all activities
      const allUserIds = new Set([
        ...(posts?.map(p => p.author_id) || []),
        ...(comments?.map(c => c.author_id) || []),
        ...(reactions?.map(r => r.user_id) || [])
      ]);

      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(allUserIds));

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Add posts
      posts?.forEach(post => {
        const user = userMap.get(post.author_id);
        allActivities.push({
          type: 'post',
          timestamp: post.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '', id: post.author_id },
          post,
        });
      });

      // Add comments
      comments?.forEach(comment => {
        const isReply = comment.parent_comment_id;
        const user = userMap.get(comment.author_id);
        const post = posts?.find(p => p.id === comment.post_id);
        allActivities.push({
          type: isReply ? 'reply' : 'comment',
          timestamp: comment.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '', id: comment.author_id },
          comment: {
            ...comment,
            parentCommentAuthor: null // We'll need to fetch this separately if needed
          },
          post,
        });
      });

      // Add reactions
      reactions?.forEach(reaction => {
        const user = userMap.get(reaction.user_id);
        const post = posts?.find(p => p.id === reaction.post_id);
        allActivities.push({
          type: 'reaction',
          timestamp: reaction.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '', id: reaction.user_id },
          reaction,
          post,
        });
      });

      // Sort by timestamp (newest first) and take the most recent
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const recentActivities = allActivities.slice(0, MAX_ACTIVITIES);

      setActivities(recentActivities);
    } catch (error) {
      console.error('Error loading initial activities:', error);
    }
  };

  // Subscribe to posts, comments, and reactions for this board
  useEffect(() => {
    if (!boardId) return;

    // Load initial activities first
    loadInitialActivities();

    // 1. Posts
    const postChannel = supabase
      .channel(`board-activity-posts:${boardId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `board_id=eq.${boardId}`
      }, async (payload) => {
        const { new: post } = payload;
        // Fetch author info
        const { data: user } = await supabase
          .from('users')
          .select('full_name, avatar_url, id')
          .eq('id', post.author_id)
          .single();
        pushActivity({
          type: 'post',
          timestamp: post.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '', id: post.author_id },
          post,
        });
      })
      .subscribe();

    // 2. Comments (need to filter by post.board_id)
    const commentChannel = supabase
      .channel(`board-activity-comments:${boardId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      }, async (payload) => {
        const { new: comment } = payload;
        // Fetch post to check board_id
        const { data: post } = await supabase
          .from('posts')
          .select('id, title, board_id')
          .eq('id', comment.post_id)
          .single();
        if (post?.board_id !== boardId) return;
        
        // Fetch author info
        const { data: user } = await supabase
          .from('users')
          .select('full_name, avatar_url, id')
          .eq('id', comment.author_id)
          .single();

        // Determine if this is a reply or top-level comment
        const isReply = comment.parent_comment_id;
        
        // If it's a reply, fetch the parent comment author
        let parentCommentAuthor = null;
        if (isReply) {
          const { data: parentComment } = await supabase
            .from('comments')
            .select('author_id')
            .eq('id', comment.parent_comment_id)
            .single();
          
          if (parentComment?.author_id) {
            const { data: parentAuthor } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', parentComment.author_id)
              .single();
            parentCommentAuthor = parentAuthor?.full_name || 'someone';
          }
        }
        
        pushActivity({
          type: isReply ? 'reply' : 'comment',
          timestamp: comment.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '', id: comment.author_id },
          comment: {
            ...comment,
            parentCommentAuthor
          },
          post,
        });
      })
      .subscribe();

    // 3. Reactions (need to filter by post.board_id)
    const reactionChannel = supabase
      .channel(`board-activity-reactions:${boardId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reactions',
      }, async (payload) => {
        const { new: reaction } = payload;
        // Fetch post to check board_id
        const { data: post } = await supabase
          .from('posts')
          .select('id, title, board_id')
          .eq('id', reaction.post_id)
          .single();
        if (post?.board_id !== boardId) return;
        
        // Fetch user info
        const { data: user } = await supabase
          .from('users')
          .select('full_name, avatar_url, id')
          .eq('id', reaction.user_id)
          .single();
        pushActivity({
          type: 'reaction',
          timestamp: reaction.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '', id: reaction.user_id },
          reaction,
          post,
        });
      })
      .subscribe();

    // 4. Comment reactions (need to filter by post.board_id)
    const commentReactionChannel = supabase
      .channel(`board-activity-comment-reactions:${boardId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comment_reactions',
      }, async (payload) => {
        const { new: commentReaction } = payload;
        
        // Fetch comment to get post_id
        const { data: comment } = await supabase
          .from('comments')
          .select('id, post_id')
          .eq('id', commentReaction.comment_id)
          .single();
        
        if (!comment) return;
        
        // Fetch post to check board_id
        const { data: post } = await supabase
          .from('posts')
          .select('id, title, board_id')
          .eq('id', comment.post_id)
          .single();
        if (post?.board_id !== boardId) return;
        
        // Fetch user info
        const { data: user } = await supabase
          .from('users')
          .select('full_name, avatar_url, id')
          .eq('id', commentReaction.user_id)
          .single();
        pushActivity({
          type: 'comment_reaction',
          timestamp: commentReaction.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '', id: commentReaction.user_id },
          reaction: commentReaction,
          post,
          comment,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(reactionChannel);
      supabase.removeChannel(commentReactionChannel);
    };
  }, [boardId]);

  // Scroll to top on new activity
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = 0;
    }
  }, [activities]);

  return (
    <div className="board-activity-stream" ref={streamRef}>
      {activities.length === 0 ? (
        <div className="no-activity">No recent activity yet</div>
      ) : (
        activities.map((activity, idx) => (
          <ActivityItem key={idx} activity={activity} currentUserId={currentUserId} boardCreatorId={boardCreatorId} />
        ))
      )}
    </div>
  );
};

export default BoardActivityStream; 