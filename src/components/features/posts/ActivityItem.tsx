import React from 'react';
import { Avatar } from 'antd';

export type ActivityType = 'post' | 'comment' | 'reply' | 'reaction' | 'comment_reaction';

export interface Activity {
  type: ActivityType;
  timestamp: string;
  user: {
    full_name: string;
    avatar_url: string;
    id?: string;
  };
  post?: any;
  comment?: any;
  reaction?: any;
}

interface ActivityItemProps {
  activity: Activity;
  currentUserId?: string;
  boardCreatorId?: string;
}

const getActivityText = (activity: Activity, onLinkClick: (id: string) => void) => {
  switch (activity.type) {
    case 'post':
      return (
        <>
          <span className="activity-username">{activity.user?.full_name || 'Someone'}</span>
          <span> just posted ✍️ </span>
          {activity.post?.id ? (
            <span
              className="activity-link"
              onClick={() => onLinkClick(activity.post.id)}
              tabIndex={0}
              role="button"
            >
              {activity.post?.title || 'a new post'}
            </span>
          ) : (
            <span className="activity-link">a new post</span>
          )}
        </>
      );
    case 'comment':
      return (
        <>
          <span className="activity-username">{activity.user?.full_name || 'Someone'}</span>
          <span> commented 💬 on </span>
          {activity.post?.id ? (
            <span
              className="activity-link"
              onClick={() => onLinkClick(activity.post.id)}
              tabIndex={0}
              role="button"
            >
              {activity.post?.title || 'a post'}
            </span>
          ) : (
            <span className="activity-link">a post</span>
          )}
          {activity.comment?.content && (
            <div className="activity-comment">{activity.comment.content}</div>
          )}
        </>
      );
    case 'reply':
      return (
        <>
          <span className="activity-username">{activity.user?.full_name || 'Someone'}</span>
          <span> replied ✉️ to </span>
          <span className="activity-link">{activity.comment?.parentCommentAuthor || 'someone'}</span>
          <span> in </span>
          {activity.post?.id ? (
            <span
              className="activity-link"
              onClick={() => onLinkClick(activity.post.id)}
              tabIndex={0}
              role="button"
            >
              {activity.post?.title || 'a post'}
            </span>
          ) : (
            <span className="activity-link">a post</span>
          )}
          {activity.comment?.content && (
            <div className="activity-comment">{activity.comment.content}</div>
          )}
        </>
      );
    case 'reaction':
      return (
        <>
          <span className="activity-username">{activity.user?.full_name || 'Someone'}</span>
          <span> liked ❤️ </span>
          {activity.post?.id ? (
            <span
              className="activity-link"
              onClick={() => onLinkClick(activity.post.id)}
              tabIndex={0}
              role="button"
            >
              {activity.post?.title || 'a post'}
            </span>
          ) : (
            <span className="activity-link">a post</span>
          )}
        </>
      );
    case 'comment_reaction':
      return (
        <>
          <span className="activity-username">{activity.user?.full_name || 'Someone'}</span>
          <span> liked ❤️ a comment on </span>
          {activity.post?.id ? (
            <span
              className="activity-link"
              onClick={() => onLinkClick(activity.post.id)}
              tabIndex={0}
              role="button"
            >
              {activity.post?.title || 'a post'}
            </span>
          ) : (
            <span className="activity-link">a post</span>
          )}
        </>
      );
    default:
      return null;
  }
};

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, currentUserId, boardCreatorId }) => {
  // Determine highlight: if the activity is by the current user or board creator
  const isOwn = currentUserId && activity.user?.id && currentUserId === activity.user.id;
  const isCreator = boardCreatorId && activity.user?.id && boardCreatorId === activity.user.id;
  const highlight = isOwn || isCreator;

  // Placeholder for link click (could scroll or open post)
  const handleLinkClick = (id: string) => {
    // TODO: Implement navigation or scroll to post
    // For now, just log
    console.log('Clicked post/comment id:', id);
  };

  return (
    <div
      className={`activity-item${highlight ? ' highlight' : ''}${isOwn ? ' own' : ''}${isCreator ? ' creator' : ''}`}
      tabIndex={0}
    >
      <Avatar src={activity.user?.avatar_url} className="activity-avatar" size={24} />
      <div className="activity-content">
        {getActivityText(activity, handleLinkClick)}
        <div className="activity-timestamp">
          {(() => {
            const date = new Date(activity.timestamp);
            const now = new Date();
            const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
            
            if (diffInHours < 1) {
              const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
              return `${diffInMinutes} minutes ago`;
            } else if (diffInHours < 24) {
              const hours = Math.floor(diffInHours);
              return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else if (diffInHours < 48) {
              return '1 day ago';
            } else {
              const days = Math.floor(diffInHours / 24);
              return `${days} days ago`;
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default ActivityItem; 