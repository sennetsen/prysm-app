// CommentThread.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Comment } from './Comment';
import { CommentInput } from './CommentInput';
import { Avatar, Button } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import './CommentThread.css';

interface CommentThreadProps {
  postId: string;
  currentUser: any;
}

interface Comment {
  id: number;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  liked: boolean;
  replies?: Comment[];
}

export function CommentThread({ postId, currentUser }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      author: {
        name: 'Username 1',
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.',
      timestamp: '9:11 PM',
      likes: 35,
      liked: false,
      replies: [
        {
          id: 2,
          author: {
            name: 'Username 1',
            avatar: 'https://i.pravatar.cc/150?img=1',
          },
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.',
          timestamp: '9:11 PM',
          likes: 56,
          liked: true,
        }
      ]
    },
    {
      id: 3,
      author: {
        name: 'Comment Deleted',
        avatar: 'https://i.pravatar.cc/150?img=3',
      },
      content: '',
      timestamp: '2 min ago',
      likes: 0,
      liked: false,
    },
    {
      id: 4,
      author: {
        name: 'Username 1',
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
      content: '@Everyone ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.',
      timestamp: '9:11 PM',
      likes: 56,
      liked: true,
    }
  ]);

  const handleLike = (commentId: number) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          liked: !comment.liked,
          likes: comment.liked ? comment.likes - 1 : comment.likes + 1
        };
      }
      
      // Check for replies
      if (comment.replies) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply.id === commentId) {
              return {
                ...reply,
                liked: !reply.liked,
                likes: reply.liked ? reply.likes - 1 : reply.likes + 1
              };
            }
            return reply;
          })
        };
      }
      
      return comment;
    }));
  };

  const renderComment = (comment: Comment, isReply = false) => {
    if (comment.author.name === 'Comment Deleted') {
      return (
        <div key={comment.id} className="comment deleted-comment">
          <Avatar src={comment.author.avatar} size={36} />
          <div className="comment-content">
            <div className="comment-header">
              <span className="comment-author">{comment.author.name}</span>
              <span className="comment-timestamp">{comment.timestamp}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={comment.id} className={`comment ${isReply ? 'reply-comment' : ''}`}>
        <Avatar src={comment.author.avatar} size={36} />
        <div className="comment-content">
          <div className="comment-header">
            <span className="comment-author">{comment.author.name}</span>
            <span className="comment-timestamp">{comment.timestamp}</span>
          </div>
          <p className="comment-text">
            {comment.content.startsWith('@') ? (
              <>
                <span className="mention">@Everyone</span>
                {comment.content.substring(9)}
              </>
            ) : comment.content}
          </p>
          <div className="comment-actions">
            <Button 
              className={`heart-button ${comment.liked ? 'liked' : ''}`}
              icon={comment.liked ? <HeartFilled /> : <HeartOutlined />}
              onClick={() => handleLike(comment.id)}
            >
              {comment.likes}
            </Button>
            <Button className="reply-button">Reply</Button>
            <Button className="delete-button">Delete</Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="comment-thread">
      {comments.map(comment => (
        <React.Fragment key={comment.id}>
          {renderComment(comment)}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="replies-container">
              {comment.replies.map(reply => renderComment(reply, true))}
              
              {comment.replies.length > 1 && (
                <div className="more-replies">
                  <div className="avatars">
                    <Avatar.Group>
                      <Avatar size="small" src="https://i.pravatar.cc/150?img=1" />
                      <Avatar size="small" src="https://i.pravatar.cc/150?img=2" />
                    </Avatar.Group>
                  </div>
                  <span>3 more replies · 18 hours ago</span>
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
