# Email Notifications Edge Function

This Supabase Edge Function handles email notifications for post subscribers using the Resend API.

## Features

- **New Comment Notifications**: Notifies all subscribers when new comments are posted
- **Board Creator Activity**: Special notifications when board creators comment or like
- **Post Like Notifications**: Notifies post authors about new likes
- **Email Threading**: Uses Message-ID headers to group related emails in inboxes
- **Smart Filtering**: Excludes activity authors from their own notifications

## Setup

### 1. Environment Variables

Set these in your Supabase Edge Function secrets:

```bash
RESEND_API_KEY=your_resend_api_key_here
SITE_URL=https://prysmapp.com
FROM_EMAIL=notifications@prysmapp.com
```

### 2. Deploy

```bash
supabase functions deploy send-email
```

### 3. Test

The function will be available at:
`https://your-project.supabase.co/functions/v1/send-email`

## Usage

### Notification Types

- `new_comment`: New comment posted
- `board_creator_like`: Board creator liked a comment
- `board_creator_comment`: Board creator posted a comment
- `post_like`: New like on a post

### Example Request

```javascript
await fetch('/functions/v1/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'new_comment',
    postId: 'post-uuid',
    postTitle: 'Post Title',
    boardPath: 'board-path',
    activityData: {
      id: 'comment-uuid',
      author_id: 'user-uuid',
      author_name: 'User Name',
      content: 'Comment content'
    }
  })
})
```

## Email Threading

Emails use consistent Message-ID headers to group related notifications in email clients, preventing inbox clutter.

## Error Handling

- Failed notifications don't break the main functionality
- Comprehensive logging for debugging
- Graceful fallbacks for missing data
