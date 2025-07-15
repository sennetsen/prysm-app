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

  // Subscribe to posts, comments, and reactions for this board
  useEffect(() => {
    if (!boardId) return;

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
          .select('full_name, avatar_url')
          .eq('id', post.author_id)
          .single();
        pushActivity({
          type: 'post',
          timestamp: post.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '' },
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
          .select('full_name, avatar_url')
          .eq('id', comment.author_id)
          .single();
        pushActivity({
          type: 'comment',
          timestamp: comment.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '' },
          comment,
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
          .select('full_name, avatar_url')
          .eq('id', reaction.user_id)
          .single();
        pushActivity({
          type: 'reaction',
          timestamp: reaction.created_at,
          user: user || { full_name: 'Unknown', avatar_url: '' },
          reaction,
          post,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(reactionChannel);
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