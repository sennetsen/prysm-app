import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

// Email notification types
enum NOTIFICATION_TYPE {
  NEW_COMMENT = 'new_comment',
  BOARD_CREATOR_LIKE = 'board_creator_like',
  BOARD_CREATOR_COMMENT = 'board_creator_comment',
  POST_LIKE = 'post_like'
}

interface NotificationData {
  type: NOTIFICATION_TYPE
  postId: string
  postTitle: string
  boardPath: string
  activityData: any
  boardCreatorEmail?: string
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)

// Generate email subject with threading support
function generateSubject(postTitle: string, type: NOTIFICATION_TYPE): string {
  const baseSubject = `[Prysm] Post: ${postTitle}`
  
  switch (type) {
    case NOTIFICATION_TYPE.NEW_COMMENT:
      return `${baseSubject} - New comment`
    case NOTIFICATION_TYPE.BOARD_CREATOR_LIKE:
      return `${baseSubject} - Board creator liked a comment`
    case NOTIFICATION_TYPE.BOARD_CREATOR_COMMENT:
      return `${baseSubject} - Board creator commented`
    case NOTIFICATION_TYPE.POST_LIKE:
      return `${baseSubject} - New like`
    default:
      return baseSubject
  }
}

// Generate email HTML content
function generateEmailHTML(
  postTitle: string, 
  boardPath: string, 
  postId: string, 
  type: NOTIFICATION_TYPE, 
  activityData: any,
  boardCreatorEmail?: string
): string {
  // Generate slug from post title for better SEO
  const slug = postTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
  
  const postUrl = `${Deno.env.get('SITE_URL') || 'https://prysmapp.com'}/${boardPath}/posts/${postId}${slug ? `/${slug}` : ''}`;
  
  let activityText = ''
  let highlightClass = ''
  
  switch (type) {
    case NOTIFICATION_TYPE.NEW_COMMENT:
      activityText = `New comment by ${activityData.author_name}: "${activityData.content.substring(0, 100)}${activityData.content.length > 100 ? '...' : ''}"`
      break
    case NOTIFICATION_TYPE.BOARD_CREATOR_LIKE:
      activityText = `Board creator liked a comment by ${activityData.commentAuthorName}`
      highlightClass = 'board-creator-activity'
      break
    case NOTIFICATION_TYPE.BOARD_CREATOR_COMMENT:
      activityText = `Board creator commented: "${activityData.content.substring(0, 100)}${activityData.content.length > 100 ? '...' : ''}"`
      highlightClass = 'board-creator-activity'
      break
    case NOTIFICATION_TYPE.POST_LIKE:
      activityText = `Your post received a new like`
      break
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prysm Notification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .activity { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin-bottom: 20px; }
        .board-creator-activity { border-left-color: #28a745; background: #f8fff9; }
        .cta-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        .unsubscribe { font-size: 12px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; color: #007bff;">Prysm</h2>
          <p style="margin: 10px 0 0 0; color: #666;">Activity update for your subscribed post</p>
        </div>
        
        <div class="activity ${highlightClass}">
          <h3 style="margin: 0 0 15px 0; color: #333;">${postTitle}</h3>
          <p style="margin: 0; color: #555;">${activityText}</p>
          <a href="${postUrl}" class="cta-button">View Post</a>
        </div>
        
        <div class="footer">
          <p>You're receiving this email because you're subscribed to updates on this post.</p>
          <p>To manage your subscriptions, visit the post and use the subscribe/unsubscribe button.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Send email using Resend
async function sendEmail(to: string, subject: string, html: string, postId: string): Promise<boolean> {
  try {
    // Create consistent Message-ID for the post thread
    const threadMessageId = `post-${postId}@prysmapp.com`;
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') || 'notifications@prysmapp.com',
        to: [to],
        subject: subject,
        html: html,
        // Use consistent Message-ID for email threading
        headers: {
          'Message-ID': threadMessageId,
          'In-Reply-To': threadMessageId,
          'References': threadMessageId
        }
      }),
    })

    if (!res.ok) {
      console.error('Resend API error:', await res.text())
      return false
    }

    const data = await res.json()
    console.log('Email sent successfully:', data)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

// Get subscribers for a post (excluding the activity author)
async function getSubscribers(postId: string, excludeUserId?: string): Promise<any[]> {
  try {
    let query = supabase
      .from('subscriptions')
      .select(`
        user_id,
        user:users(
          id,
          email,
          full_name
        )
      `)
      .eq('post_id', postId)

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching subscribers:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getSubscribers:', error)
    return []
  }
}

// Send notifications to subscribers
async function sendNotifications(
  postId: string, 
  postTitle: string, 
  boardPath: string, 
  type: NOTIFICATION_TYPE, 
  activityData: any,
  excludeUserId?: string,
  boardCreatorEmail?: string
): Promise<void> {
  try {
    // Get subscribers (excluding the activity author AND the board creator if they're the one doing the activity)
    let subscribers = await getSubscribers(postId, excludeUserId);
    
    // If this is board creator activity, exclude the board creator from notifications
    if (boardCreatorEmail && excludeUserId) {
      // Get the board creator's user ID to exclude them
      const { data: boardCreatorUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', boardCreatorEmail)
        .single();
      
      if (boardCreatorUser) {
        const beforeCount = subscribers.length;
        subscribers = subscribers.filter(sub => sub.user_id !== boardCreatorUser.id);
        const afterCount = subscribers.length;
        
        if (beforeCount !== afterCount) {
          console.log(`Excluded board creator (${boardCreatorEmail}) from notifications. Subscribers: ${beforeCount} → ${afterCount}`);
        }
      }
    }
    
    if (subscribers.length === 0) {
      console.log('No subscribers to notify');
      return;
    }

    // Generate email content
    const subject = generateSubject(postTitle, type);
    const html = generateEmailHTML(postTitle, boardPath, postId, type, activityData, boardCreatorEmail);

    // Send emails to all subscribers
    const emailPromises = subscribers.map(subscriber => 
      sendEmail(subscriber.user.email, subject, html, postId)
    );

    const results = await Promise.allSettled(emailPromises);
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;
    
    console.log(`Notifications sent: ${successful} successful, ${failed} failed`);
    
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

// Main handler
serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const notificationData: NotificationData = await req.json()
    
    // Validate required fields
    if (!notificationData.postId || !notificationData.postTitle || !notificationData.boardPath || !notificationData.type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Send notifications based on type
    await sendNotifications(
      notificationData.postId,
      notificationData.postTitle,
      notificationData.boardPath,
      notificationData.type,
      notificationData.activityData,
      notificationData.activityData?.author_id,
      notificationData.boardCreatorEmail
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
