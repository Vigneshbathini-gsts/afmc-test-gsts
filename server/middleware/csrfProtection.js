const trustedOrigins = (
  process.env.CORS_ORIGIN ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000,http://localhost:5173")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => new URL(origin).origin);

module.exports = function csrfProtection(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  if (req.get("authorization")?.startsWith("Bearer ")) {
    return next();
  }

  const originHeader = req.get("origin");
  const refererHeader = req.get("referer");
  let requestOrigin;

  try {
    requestOrigin = originHeader
      ? new URL(originHeader).origin
      : refererHeader
        ? new URL(refererHeader).origin
        : null;
  } catch {
    requestOrigin = null;
  }

  if (!requestOrigin || !trustedOrigins.includes(requestOrigin)) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
    });
  }

  return next();
};
