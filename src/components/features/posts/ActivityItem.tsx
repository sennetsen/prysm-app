import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../../shared';

export type ActivityType = 'post' | 'comment' | 'reply' | 'reaction' | 'comment_reaction';

export interface Activity {
  type: ActivityType;
  timestamp: string;
  user: {
    full_name: string;
    avatar_url: string;
    avatar_storage_path?: string;
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
          <span>just posted ✍️</span>
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
          <span>commented 💬 on</span>
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
            <div className="activity-comment">
              {activity.comment.content.length > 25
                ? activity.comment.content.slice(0, 25) + '…'
                : activity.comment.content}
            </div>
          )}
        </>
      );
    case 'reply':
      return (
        <>
          <span className="activity-username">{activity.user?.full_name || 'Someone'}</span>
          <span>replied ✉️ to </span>
          <span className="activity-username">{activity.comment?.parentCommentAuthor || 'someone'}</span>
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
            <div className="activity-comment">
              {activity.comment.content.length > 25
                ? activity.comment.content.slice(0, 25) + '…'
                : activity.comment.content}
            </div>
          )}
        </>
      );
    case 'reaction':
      return (
        <>
          <span className="activity-username">{activity.user?.full_name || 'Someone'}</span>
          <span>liked ❤️</span>
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
          <span>liked 💬 on a comment in</span>
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
  const navigate = useNavigate();
  const { boardPath } = useParams();

  const handleLinkClick = (postId: string) => {
    if (boardPath) {
      navigate(`/${boardPath}/posts/${postId}`);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffInSeconds = Math.floor(diffMs / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 2592000) { // 30 days
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months}mo ago`;
    }
  };

  return (
    <div className="activity-item">
      <div className="activity-avatar">
        <Avatar user={activity.user} size={24} />
      </div>
      <div className="activity-content">
        <div className="activity-text">
          {getActivityText(activity, handleLinkClick)}
        </div>
        <div className="activity-timestamp">
          {formatTimestamp(activity.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default ActivityItem; 