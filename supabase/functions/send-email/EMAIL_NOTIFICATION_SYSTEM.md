# Email Notification System Implementation

## Overview

This document outlines the complete email notification system for Prysm, which automatically notifies post subscribers about various activities using Supabase Edge Functions and Resend API.

## System Architecture

### 1. **Supabase Edge Function** (`/supabase/functions/send-email/`)
- Handles all email sending via Resend API
- Processes different notification types
- Manages subscriber filtering and email generation

### 2. **Frontend Notification Service** (`/src/utils/notificationService.ts`)
- Provides clean API for sending notifications
- Handles different notification types
- Manages API calls to the Edge Function

### 3. **Integration Points**
- Comment creation (PostPopup.tsx)
- Post likes (App.js)
- Comment likes (PostPopup.tsx)

## Notification Types & Rules

### **New Comments** 📝
- **Trigger**: Any user posts a comment or reply
- **Recipients**: All post subscribers (except comment author)
- **Special Case**: Board creator comments get highlighted notifications

### **Board Creator Activity** 👑
- **Trigger**: Board creator comments or likes comments
- **Recipients**: All post subscribers (except board creator)
- **Highlighting**: Special styling in emails

### **Post Likes** ❤️
- **Trigger**: Someone likes a post
- **Recipients**: Post author only (if subscribed)
- **Exclusion**: Users don't get notified about their own likes

## Email Features

### **Threading** 🧵
- **Message-ID**: Consistent headers for email grouping
- **Subject Format**: `[Prysm] Post Title - Activity Type`
- **Inbox Organization**: Related notifications grouped together

### **Content** 📧
- **Post Title**: Clear identification of the post
- **Activity Summary**: Brief description of what happened
- **Direct Link**: "View Post" button for immediate access
- **Responsive Design**: Mobile-friendly email templates

### **Smart Filtering** 🎯
- **Author Exclusion**: Activity authors don't get their own notifications
- **Duplicate Prevention**: No spam from multiple activities
- **Board Creator Recognition**: Special handling for board owners

## Implementation Details

### **Performance Optimizations** ⚡
- **Conditional Subscriptions**: Skip upsert if already subscribed
- **Batch Processing**: Handle multiple subscribers efficiently
- **Error Isolation**: Notification failures don't break main functionality

### **Real-time Integration** 🔄
- **Immediate Updates**: Subscription state updates instantly
- **Real-time Subscribers**: Live subscriber list updates
- **Consistent State**: UI reflects changes without refresh

## Setup Instructions

### **1. Resend Configuration**
```bash
# Get API key from Resend dashboard
# Verify your domain
# Set up custom sending address
```

### **2. Supabase Edge Function**
```bash
# Set environment variables
RESEND_API_KEY=your_key
SITE_URL=https://prysmapp.com
FROM_EMAIL=notifications@prysmapp.com

# Deploy function
supabase functions deploy send-email
```

### **3. Frontend Integration**
```javascript
// Import notification service
import { notifyNewComment, notifyBoardCreatorActivity } from './utils/notificationService';

// Send notifications
await notifyNewComment(postId, commentData, boardPath, postTitle);
```

## User Experience

### **Subscription Management** 🔧
- **Automatic**: Users get subscribed when they comment
- **Manual**: Users can manually subscribe/unsubscribe
- **Transparent**: Clear feedback about subscription status

### **Email Preferences** 📧
- **Frequency**: One email per activity type
- **Content**: Relevant information with direct links
- **Unsubscribe**: Easy management through post interface

### **Notification Timing** ⏰
- **Immediate**: Notifications sent right after activity
- **Batched**: Multiple activities can be consolidated
- **Smart**: No duplicate notifications for same user

## Testing & Debugging

### **Local Testing** 🧪
```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve send-email --env-file .env
```

### **Production Monitoring** 📊
- **Function Logs**: Supabase dashboard monitoring
- **Email Delivery**: Resend analytics dashboard
- **Error Tracking**: Comprehensive error logging

### **Common Issues** 🔍
- **CORS Errors**: Check function CORS settings
- **API Key Issues**: Verify Resend API key
- **Subscriber Filtering**: Check database permissions

## Future Enhancements

### **Advanced Features** 🚀
- **Email Templates**: Customizable notification styles
- **Frequency Controls**: User preference for notification frequency
- **Push Notifications**: Mobile app integration
- **Digest Emails**: Daily/weekly activity summaries

### **Scalability** 📈
- **Rate Limiting**: Prevent notification spam
- **Queue System**: Handle high-volume notifications
- **Analytics**: Track notification engagement
- **A/B Testing**: Optimize email content

## Security Considerations

### **Data Protection** 🔒
- **User Privacy**: Only send to subscribed users
- **Content Filtering**: Sanitize user-generated content
- **Rate Limiting**: Prevent abuse of notification system

### **Access Control** 🛡️
- **Function Security**: JWT verification for sensitive operations
- **Database Permissions**: Row-level security for subscriptions
- **API Limits**: Resend API rate limiting

## Conclusion

This email notification system provides a comprehensive, scalable solution for keeping post subscribers engaged while maintaining performance and user experience. The system automatically handles the most common use cases while providing flexibility for future enhancements.
