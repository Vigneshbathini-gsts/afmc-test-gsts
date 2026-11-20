const db = require("../config/db");

module.exports = (getOrderNumber) => async (req, res, next) => {
  const rawOrderNumber = getOrderNumber(req);
  const normalizedOrderNumber = String(rawOrderNumber ?? "").trim();
  const orderNumber = Number(normalizedOrderNumber);
  const userId = Number(req.user?.userId);
  const roleId = Number(req.user?.roleId);
  const username = String(req.user?.username || "").trim();

  if (
    !/^\d+$/.test(normalizedOrderNumber) ||
    !Number.isSafeInteger(orderNumber) ||
    orderNumber <= 0
  ) {
    return res.status(400).json({ success: false, message: "Invalid order number." });
  }

  if (roleId === 10) {
    req.authorizedOrderNumber = orderNumber;
    return next();
  }

  if (![20, 30].includes(roleId) || !Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  try {
    const [rows] = await db.execute(
      `SELECT oh.user_id, oh.created_by,
              EXISTS (
                SELECT 1
                FROM xxafmc_kitchen_notification kn
                WHERE kn.ordernumber = oh.order_num
                  AND kn.user_name = ?
              ) AS assigned_to_attendant
       FROM xxafmc_order_header oh
       WHERE oh.order_num = ?
       LIMIT 1`,
      [userId, orderNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const ownsOrder = roleId === 20 && Number(rows[0].user_id) === userId;
    const isAssignedAttendant =
      roleId === 30 && (
        Number(rows[0].assigned_to_attendant) === 1 ||
        (username && String(rows[0].created_by || "").toLowerCase() === username.toLowerCase())
      );
    if (!ownsOrder && !isAssignedAttendant) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    req.authorizedOrderNumber = orderNumber;
    return next();
  } catch {
    return res.status(503).json({
      success: false,
      message: "Order access could not be verified.",
    });
  }
};
