const invoiceReportService = require("./InvoiceReportservice");

exports.getInvoiceReportByOrderNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const data = await invoiceReportService.getInvoiceReportByOrderNumber(orderNumber);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Failed to fetch invoice report");
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 404 ? "Invoice report not found." : "Failed to fetch invoice report",
    });
  }
};
