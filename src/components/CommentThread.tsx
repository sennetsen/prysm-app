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
    subscribeToComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:users(full_name, avatar_url),
        attachments(*),
        replies:comments!parent_comment_id(
          *,
          author:users(full_name, avatar_url),
          attachments(*)
        )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="comment-thread">
      <CommentInput
        postId={postId}
        currentUser={currentUser}
        onSubmit={fetchComments}
      />

      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment-with-replies">
            <Comment
              comment={comment}
              currentUser={currentUser}
              onReply={fetchComments}
            />

            {comment.replies?.map((reply: any) => (
              <div key={reply.id} className="comment-reply">
                <Comment
                  comment={reply}
                  currentUser={currentUser}
                  onReply={fetchComments}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
