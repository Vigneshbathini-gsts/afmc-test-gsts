module.exports = (...allowedRoleIds) => (req, res, next) => {
  const roleId = Number(req.user?.roleId ?? req.user?.ROLE_ID);
  if (!allowedRoleIds.includes(roleId)) return res.status(403).json({ success: false, message: "Forbidden" });
  return next();
};
