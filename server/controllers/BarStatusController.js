const BarStatusService = require('../services/BarStatusService')
const { broadcastBarStatus } = require("../utils/barStatusEvents");

const getBarStatus = async (req, res) => {
    try {
        const data = await BarStatusService.getBarStatus();

        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        //   console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch bar status",
        });

    }
}


const updateBarStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const data = await BarStatusService.updateBarStatus({
            status,
            updatedBy:
                req.user?.email ||
                req.user?.USER_NAME ||
                req.user?.userName ||
                req.user?.username ||
                "SYSTEM",
        })

        broadcastBarStatus(data);

        return res.status(200).json({
            success: true,
            message: "Bar status updated successfully",
            data,
        });
    }
    catch (error) {
        console.error("Failed to update bar status");

        return res.status(400).json({
            success: false,
            message: "Failed to update bar status",
        });
    }
}


module.exports = {
  getBarStatus,
  updateBarStatus,
};
