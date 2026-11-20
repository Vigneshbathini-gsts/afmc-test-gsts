const orderService = require("../services/orderHistoryService");
const {
  successResponse,
  errorResponse,
} = require("../utils/responseHandler");

const getOrderHistory = async (req, res) => {
  try {
    const filters = {
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      username: req.query.username,
      appUser: req.user?.username,
    };

    const orders = await orderService.fetchOrderHistory(filters);

    return successResponse(res, "Order history fetched", orders);
  } catch (error) {
    console.error("Failed to fetch order history");
    return errorResponse(res, "Unable to fetch order history.");
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const details = await orderService.fetchOrderDetails(orderId);

    return successResponse(res, "Order details fetched", details);
  } catch (error) {
    console.error("Failed to fetch order details");
    return errorResponse(res, "Unable to fetch order details.");
  }
};
module.exports = {
  getOrderHistory,
  getOrderDetails,
};