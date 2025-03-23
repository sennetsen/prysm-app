// CommentThread.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Comment } from './Comment';
import { CommentInput } from './CommentInput';

interface CommentThreadProps {
  postId: string;
  currentUser: any;
}

export function CommentThread({ postId, currentUser }: CommentThreadProps) {
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    fetchComments();
    const unsubscribe = subscribeToComments();
    return () => unsubscribe();
  }, [postId]);

  const fetchComments = async () => {
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        parent_comment_id,
        content,
        is_anonymous,
        created_at,
        author:users!author_id(
          full_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return;
    }

    setComments(commentsData || []);
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div>
      <CommentInput postId={postId} currentUser={currentUser} onSubmit={fetchComments} />
      <div style={{ marginTop: 16 }}>
        {comments.map((comment) => (
          <Comment key={comment.id} comment={comment} currentUser={currentUser} onReply={fetchComments} />
        ))}
      </div>
    </div>
  );
}
