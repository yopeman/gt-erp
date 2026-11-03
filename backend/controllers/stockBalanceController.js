import StockBalance from '../models/StockBalance.js';
import InventoryItem from '../models/InventoryItem.js';
import Warehouse from '../models/Warehouse.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Get stock balances with filters & pagination
export const getStockBalances = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      warehouse,
      item,
      lowStock = 'false',
      search
    } = req.query;

    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (item) query.item = item;

    // Filter items matching search if search query is provided
    if (search) {
      const matchingItems = await InventoryItem.find({
        $or: [
          { itemName: { $regex: search, $options: 'i' } },
          { itemCode: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.item = { $in: matchingItems.map((i) => i._id) };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let balances = await StockBalance.find(query)
      .populate('item', 'itemName itemCode category unitOfMeasurement minimumStockLevel reorderLevel unitCost')
      .populate('warehouse', 'warehouseName warehouseCode branch')
      .sort({ updatedAt: -1 });

    // Optional client filter for low stock items (quantityOnHand <= minimumStockLevel or reorderLevel)
    if (lowStock === 'true') {
      balances = balances.filter((b) => {
        const min = b.minimumStockLevel || (b.item && b.item.minimumStockLevel) || 0;
        return b.quantityOnHand <= min;
      });
    }

    const total = balances.length;
    const paginated = balances.slice(skip, skip + parseInt(limit, 10));

    return sendSuccess(res, 'Stock balances retrieved successfully', paginated, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch stock balances', 500, error);
  }
};

// Get single stock balance by ID
export const getStockBalanceById = async (req, res) => {
  try {
    const balance = await StockBalance.findById(req.params.id)
      .populate('item')
      .populate('warehouse');

    if (!balance) {
      return sendError(res, 'Stock balance not found', 404);
    }
    return sendSuccess(res, 'Stock balance retrieved successfully', balance);
  } catch (error) {
    return sendError(res, 'Failed to retrieve stock balance', 500, error);
  }
};

// Get all items in a specific warehouse
export const getStockByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const balances = await StockBalance.find({ warehouse: warehouseId })
      .populate('item', 'itemName itemCode category unitOfMeasurement brand unitCost reorderLevel')
      .populate('warehouse', 'warehouseName warehouseCode');

    return sendSuccess(res, 'Warehouse stock retrieved successfully', balances);
  } catch (error) {
    return sendError(res, 'Failed to retrieve warehouse stock', 500, error);
  }
};

// Get stock across all warehouses for a specific item
export const getStockByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const balances = await StockBalance.find({ item: itemId })
      .populate('warehouse', 'warehouseName warehouseCode branch location')
      .populate('item', 'itemName itemCode unitOfMeasurement');

    return sendSuccess(res, 'Item stock retrieved successfully', balances);
  } catch (error) {
    return sendError(res, 'Failed to retrieve item stock', 500, error);
  }
};

