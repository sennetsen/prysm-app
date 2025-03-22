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
    return () => {
      unsubscribe(); // Clean up subscription
    };
  }, [postId]);

  const fetchComments = async () => {
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        parent_comment_id,
        author_id,
        content,
        is_anonymous,
        reaction_counts,
        created_at,
        updated_at,
        author:users!author_id(
          id,
          email,
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

    // Fetch attachments for the comments only if there are comments
    const commentIds = commentsData.map(comment => comment.id);
    console.log('Comment IDs:', commentIds);

    if (commentIds.length > 0) {
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .eq('parent_type', 'comment')
        .in('parent_id', commentIds);

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
        return;
      }

      // Merge attachments into comments
      const commentsWithAttachments = commentsData.map(comment => ({
        ...comment,
        attachments: attachmentsData.filter(attachment => attachment.parent_id === comment.id),
      }));

      setComments(commentsWithAttachments);
    } else {
      // If no comments, just set an empty array
      setComments([]);
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
