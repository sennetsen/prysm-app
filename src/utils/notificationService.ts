// Notification service for email notifications via Supabase Edge Functions

export enum NOTIFICATION_TYPES {
  NEW_COMMENT = 'new_comment',
  BOARD_CREATOR_LIKE = 'board_creator_like',
  BOARD_CREATOR_COMMENT = 'board_creator_comment',
  POST_LIKE = 'post_like'
}

interface NotificationPayload {
  type: NOTIFICATION_TYPES
  postId: string
  postTitle: string
  boardPath: string
  activityData: any
  boardCreatorEmail?: string
}

// Send notification via Supabase Edge Function
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch('/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('Failed to send notification:', await response.text())
      return false
    }

    const result = await response.json()
    console.log('Notification sent successfully:', result)
    return true
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

// Notify subscribers about new comment
export async function notifyNewComment(
  postId: string,
  commentData: {
    id: string
    author_id: string
    author_name: string
    content: string
  },
  boardPath: string,
  postTitle: string
): Promise<boolean> {
  return sendNotification({
    type: NOTIFICATION_TYPES.NEW_COMMENT,
    postId,
    postTitle,
    boardPath,
    activityData: commentData
  })
}

// Notify subscribers about board creator activity
export async function notifyBoardCreatorActivity(
  postId: string,
  type: NOTIFICATION_TYPES.BOARD_CREATOR_LIKE | NOTIFICATION_TYPES.BOARD_CREATOR_COMMENT,
  activityData: any,
  boardPath: string,
  postTitle: string,
  boardCreatorEmail: string
): Promise<boolean> {
  return sendNotification({
    type,
    postId,
    postTitle,
    boardPath,
    activityData,
    boardCreatorEmail
  })
}

// Notify post author about new like
export async function notifyPostLike(
  postId: string,
  postTitle: string,
  boardPath: string
): Promise<boolean> {
  return sendNotification({
    type: NOTIFICATION_TYPES.POST_LIKE,
    postId,
    postTitle,
    boardPath,
    activityData: {}
  })
}
