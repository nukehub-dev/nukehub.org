import { useEffect, useState } from "react";
import { fetchLatestBlogPosts, type BlogPost } from "./blog";

/**
 * Loads the latest NukeBlog posts on the client. `loading` stays true until
 * the fetch settles; on failure `posts` is simply empty.
 */
export function useBlogPosts(limit = 3) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLatestBlogPosts(limit).then((result) => {
      if (cancelled) return;
      setPosts(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { posts, loading };
}
