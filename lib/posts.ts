// Re-export posts functions from db.ts with corrected names
export { getPosts as getAllPosts, getPostById, createPost } from './db'
export type { Post, Comment } from './db'
