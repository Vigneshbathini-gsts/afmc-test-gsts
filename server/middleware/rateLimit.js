const crypto = require("crypto");
const db = require("../config/db");
let requestsSinceCleanup = 0;

module.exports = function rateLimit({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    const route = req.path.toLowerCase().replace(/\/+$/, "") || "/";
    const identity = `${req.ip || req.socket.remoteAddress || "unknown"}:${route}`;
    const bucketKey = crypto.createHash("sha256").update(identity).digest("hex");

    try {
      requestsSinceCleanup += 1;
      if (requestsSinceCleanup >= 100) {
        await db.execute(
          "DELETE FROM api_rate_limit_buckets WHERE window_started_at < UNIX_TIMESTAMP() - 86400"
        );
        requestsSinceCleanup = 0;
      }

      await db.execute(
        `
          INSERT INTO api_rate_limit_buckets (bucket_key, window_started_at, request_count)
          VALUES (?, UNIX_TIMESTAMP(), 1)
          ON DUPLICATE KEY UPDATE
            request_count = IF(
              window_started_at <= UNIX_TIMESTAMP() - ?,
              1,
              request_count + 1
            ),
            window_started_at = IF(
              window_started_at <= UNIX_TIMESTAMP() - ?,
              UNIX_TIMESTAMP(),
              window_started_at
            )
        `,
        [bucketKey, windowSeconds, windowSeconds]
      );

      const [[bucket]] = await db.execute(
        `SELECT request_count, window_started_at, UNIX_TIMESTAMP() AS current_epoch
         FROM api_rate_limit_buckets
         WHERE bucket_key = ?`,
        [bucketKey]
      );

      if (bucket.request_count > max) {
        const retryAfter = Math.max(
          1,
          windowSeconds - (Number(bucket.current_epoch) - Number(bucket.window_started_at))
        );
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
      }

      return next();
    } catch {
      return res.status(503).json({
        success: false,
        message: "Request protection is temporarily unavailable.",
      });
    }
  };
};
