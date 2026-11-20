// payment controller


const paymentService = require("./paymentService");
const {
  successResponse,
  errorResponse,
} = require("../../utils/responseHandler");

const getPaymentModes = async (req, res) => {
  try {
    const roleId = req.user.roleId;
    const loginType = req.user.loginType;

    const modes = await paymentService.fetchPaymentModes({ roleId, loginType });

    return successResponse(res, "Payment modes fetched", modes);
  } catch (error) {
    console.error("Failed to fetch payment modes");
    return errorResponse(res, "Unable to fetch payment modes.");
  }
};

const updatePayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      createdBy: req.user?.username || req.user?.userName || "SYSTEM",
    };

    const response = await paymentService.processPayment(paymentData);

    return successResponse(res, "Payment updated", response);
  } catch (error) {
    console.error("Failed to update payment");
    return errorResponse(res, "Unable to update payment.");
  }
};

module.exports = {
  getPaymentModes,
  updatePayment,
};
