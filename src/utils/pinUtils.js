// Pin utilities for managing user-specific pinned posts
// Using localStorage to store user-specific pins without affecting other users

/**
 * Get the storage key for pinned posts for a specific user and board
 * @param {string} userId - The user ID
 * @param {string} boardId - The board ID
 * @returns {string} The storage key
 */
const getPinStorageKey = (userId, boardId) => {
  return `pins_${userId}_${boardId}`;
};

/**
 * Get pinned post IDs for a user on a specific board
 * @param {string} userId - The user ID
 * @param {string} boardId - The board ID
 * @returns {Array<string>} Array of pinned post IDs in order of pinning
 */
export const getPinnedPostIds = (userId, boardId) => {
  if (!userId || !boardId) return [];
  
  try {
    const key = getPinStorageKey(userId, boardId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting pinned posts:', error);
    return [];
  }
};

/**
 * Pin a post for a user on a specific board
 * @param {string} userId - The user ID
 * @param {string} boardId - The board ID
 * @param {string} postId - The post ID to pin
 */
export const pinPost = (userId, boardId, postId) => {
  if (!userId || !boardId || !postId) return;
  
  try {
    const pinnedIds = getPinnedPostIds(userId, boardId);
    
    // Don't add if already pinned
    if (pinnedIds.includes(postId)) return;
    
    // Add to end of array (most recently pinned)
    pinnedIds.push(postId);
    
    const key = getPinStorageKey(userId, boardId);
    localStorage.setItem(key, JSON.stringify(pinnedIds));
  } catch (error) {
    console.error('Error pinning post:', error);
  }
};

/**
 * Unpin a post for a user on a specific board
 * @param {string} userId - The user ID
 * @param {string} boardId - The board ID
 * @param {string} postId - The post ID to unpin
 */
export const unpinPost = (userId, boardId, postId) => {
  if (!userId || !boardId || !postId) return;
  
  try {
    const pinnedIds = getPinnedPostIds(userId, boardId);
    const filteredIds = pinnedIds.filter(id => id !== postId);
    
    const key = getPinStorageKey(userId, boardId);
    localStorage.setItem(key, JSON.stringify(filteredIds));
  } catch (error) {
    console.error('Error unpinning post:', error);
  }
};

/**
 * Check if a post is pinned for a user on a specific board
 * @param {string} userId - The user ID
 * @param {string} boardId - The board ID
 * @param {string} postId - The post ID to check
 * @returns {boolean} True if the post is pinned
 */
export const isPostPinned = (userId, boardId, postId) => {
  if (!userId || !boardId || !postId) return false;
  
  const pinnedIds = getPinnedPostIds(userId, boardId);
  return pinnedIds.includes(postId);
};

/**
 * Sort posts array with pinned posts first, maintaining original order within each group
 * @param {Array} posts - Array of post objects with id property
 * @param {string} userId - The user ID
 * @param {string} boardId - The board ID
 * @returns {Array} Sorted array with pinned posts first
 */
export const sortPostsWithPins = (posts, userId, boardId) => {
  if (!userId || !boardId || !posts.length) return posts;
  
  const pinnedIds = getPinnedPostIds(userId, boardId);
  if (!pinnedIds.length) return posts;
  
  const pinned = [];
  const unpinned = [];
  
  // Separate pinned and unpinned posts
  posts.forEach(post => {
    if (pinnedIds.includes(post.id)) {
      pinned.push(post);
    } else {
      unpinned.push(post);
    }
  });
  
  // Sort pinned posts by their pin order (most recently pinned first)
  pinned.sort((a, b) => {
    const aIndex = pinnedIds.indexOf(a.id);
    const bIndex = pinnedIds.indexOf(b.id);
    return bIndex - aIndex; // Reverse order so most recent pins are first
  });
  
  // Return pinned posts first, then unpinned posts
  return [...pinned, ...unpinned];
};
