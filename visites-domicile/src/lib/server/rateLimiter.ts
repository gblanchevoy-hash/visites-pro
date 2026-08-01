// Simple in-memory rate limiter — resets on server restart.
// Good enough for a small-to-medium user base on a single Vercel instance.
// For high scale, replace with Upstash Redis or Vercel KV.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limits: N requests per windowMs per key (e.g. per user_id or per IP)
export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

// Periodic cleanup to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  Array.from(buckets.entries()).forEach(([key, bucket]) => {
    if (now > bucket.resetAt) buckets.delete(key);
  });
}, 5 * 60 * 1000);
