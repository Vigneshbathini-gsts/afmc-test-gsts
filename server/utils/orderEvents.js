const clients = new Set();
const HEARTBEAT_MS = 25000;

function subscribe(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  const client = { res, user: req.user };
  clients.add(client);

  const heartbeatId = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeatId);
      clients.delete(client);
    }
  }, HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeatId);
    clients.delete(client);
  });
}

function buildOrderStatusUpdatePayload({ orderNumber, status, payment_status, paymentStatus }) {
  return {
    orderNumber: String(orderNumber ?? ""),
    status: String(status || "Received"),
    payment_status: String(payment_status || paymentStatus || "Not Paid"),
  };
}

function canReceiveOrderStatusUpdate(user, accessRows) {
  const roleId = Number(user?.roleId);
  const userId = Number(user?.userId);
  const username = String(user?.username || "").toLowerCase();

  return (
    roleId === 10 ||
    (roleId === 20 && Number(accessRows[0]?.user_id) === userId) ||
    (roleId === 30 &&
      accessRows.some(
        (row) =>
          Number(row.assigned_user_id) === userId ||
          (username && String(row.created_by || "").toLowerCase() === username)
      ))
  );
}

function canReceiveOrderConfirmed(user, payload) {
  const roleId = Number(user?.roleId);
  const outletType = String(user?.outletType || "").toLowerCase();
  const kitchenTypes = Array.isArray(payload?.kitchenTypes)
    ? payload.kitchenTypes.map((type) => String(type).toLowerCase())
    : [];

  return roleId === 10 || (roleId === 40 && outletType && kitchenTypes.includes(outletType));
}

async function emitOrderStatusUpdate(orderNumber, overrides = {}) {
  const normalizedOrderNumber = String(orderNumber ?? "").trim();
  if (!normalizedOrderNumber) {
    return;
  }

  let snapshot = {};
  let accessRows;
  try {
    const db = require("../config/db");
    const [rows] = await db.execute(
      `SELECT oh.user_id, oh.created_by, kn.user_name AS assigned_user_id
       FROM xxafmc_order_header oh
       LEFT JOIN xxafmc_kitchen_notification kn ON kn.ordernumber = oh.order_num
       WHERE oh.order_num = ?`,
      [normalizedOrderNumber]
    );
    if (!rows.length) return;
    accessRows = rows;
  } catch {
    console.error("Unable to verify order event access");
    return;
  }

  try {
    const ConfirmOrdermodel = require("../models/ConfirmOrdermodel");
    const data = await ConfirmOrdermodel.getConfirmedOrderDetails(normalizedOrderNumber);
    snapshot = {
      status: data?.header?.status,
      payment_status: data?.header?.payment_status,
    };
  } catch {
    console.error("Unable to resolve order status snapshot");
  }

  const payload = buildOrderStatusUpdatePayload({
    orderNumber: normalizedOrderNumber,
    ...snapshot,
    ...overrides,
  });
  const body = `event: order-status-updated\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const client of clients) {
    if (!canReceiveOrderStatusUpdate(client.user, accessRows)) continue;

    try {
      client.res.write(body);
    } catch {
      clients.delete(client);
    }
  }
}

function emitOrderConfirmed(payload) {
  const body = `event: order-confirmed\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const client of clients) {
    if (!canReceiveOrderConfirmed(client.user, payload)) continue;

    try {
      client.res.write(body);
    } catch {
      clients.delete(client);
    }
  }
}

module.exports = {
  buildOrderStatusUpdatePayload,
  canReceiveOrderConfirmed,
  canReceiveOrderStatusUpdate,
  emitOrderConfirmed,
  emitOrderStatusUpdate,
  subscribe,
};
