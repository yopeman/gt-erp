import InventoryAuditLog from '../models/InventoryAuditLog.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Get inventory audit logs with pagination
export const getInventoryAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, item, warehouse, action } = req.query;
    const query = {};
    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (action) query.action = action;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await InventoryAuditLog.countDocuments(query);
    const logs = await InventoryAuditLog.find(query)
      .populate('item', 'itemName itemCode')
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate('performedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Inventory audit logs retrieved successfully', logs, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch inventory audit logs', 500, error);
  }
};

