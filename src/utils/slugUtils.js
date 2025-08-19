// Utility function to generate SEO-friendly slugs from post titles

/**
 * Generates a URL-friendly slug from a post title
 * @param {string} title - The post title
 * @returns {string} - The generated slug
 */
export function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
    .substring(0, 60);             // Limit length to 60 characters
}

/**
 * Generates a full post URL with slug
 * @param {string} boardPath - The board path
 * @param {string} postId - The post UUID
 * @param {string} title - The post title
 * @returns {string} - The full post URL
 */
export function generatePostUrl(boardPath, postId, title) {
  const slug = generateSlug(title);
  return `/${boardPath}/posts/${postId}${slug ? `/${slug}` : ''}`;
}

/**
 * Generates a post URL without slug (backward compatibility)
 * @param {string} boardPath - The board path
 * @param {string} postId - The post UUID
 * @returns {string} - The post URL without slug
 */
export function generatePostUrlWithoutSlug(boardPath, postId) {
  return `/${boardPath}/posts/${postId}`;
}
