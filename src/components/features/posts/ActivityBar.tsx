import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { Avatar } from 'antd';

interface ActivityBarProps {
  postId: string;
}

export function ActivityBar({ postId }: ActivityBarProps) {
  const [topComments, setTopComments] = useState<any[]>([]);

  const fetchTopComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:users(full_name, avatar_url),
        reaction_counts
      `)
      .eq('post_id', postId)
      .order('reaction_counts->like', { ascending: false })
      .limit(3);

    if (!error && data) {
      setTopComments(data);
    }
  }, [postId]);

  const subscribeToComments = useCallback(() => {
    const channel = supabase
      .channel(`top-comments:${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      }, () => {
        fetchTopComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchTopComments]);

  useEffect(() => {
    fetchTopComments();
    const unsubscribe = subscribeToComments();
    return () => unsubscribe();
  }, [fetchTopComments, subscribeToComments]);

  return (
    <div className="activity-bar">
      <div className="activity-bubbles">
        {[0, 1, 2].map((index) => (
          <div key={index} className="activity-bubble">
            {topComments[index] ? (
              <>
                <Avatar src={topComments[index].author?.avatar_url} />
                <div className="comment-preview">
                  <span className="author-name">
                    {topComments[index].is_anonymous
                      ? 'Anonymous'
                      : topComments[index].author?.full_name}
                  </span>
                  <p>{topComments[index].content}</p>
                </div>
              </>
            ) : (
              <div className="empty-bubble" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 