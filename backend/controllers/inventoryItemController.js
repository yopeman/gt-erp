import InventoryItem from '../models/InventoryItem.js';
import StockBalance from '../models/StockBalance.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { recordAudit, generateNextItemCode } from '../utils/inventoryHelper.js';

// Get next auto-incremented item code (e.g. GT-001)
export const getNextItemCode = async (req, res) => {
  try {
    const nextCode = await generateNextItemCode();
    return sendSuccess(res, 'Next item code generated successfully', { nextCode });
  } catch (error) {
    return sendError(res, 'Failed to generate next item code', 500, error);
  }
};

// Create item
export const createItem = async (req, res) => {
  try {
    const {
      itemName,
      itemCode,
      description,
      category,
      itemType,
      unitOfMeasurement,
      brand,
      model,
      specifications,
      minimumStockLevel,
      maximumStockLevel,
      reorderLevel,
      unitCost,
      currency,
      preferredSupplier,
      image,
      attachments,
      status
    } = req.body;

    if (!itemName || !category || !itemType || !unitOfMeasurement) {
      return sendError(res, 'Item name, category, itemType and unitOfMeasurement are required', 400);
    }

    let finalItemCode = itemCode && itemCode.trim() ? itemCode.toUpperCase().trim() : '';
    if (!finalItemCode) {
      finalItemCode = await generateNextItemCode();
    } else {
      const existing = await InventoryItem.findOne({ itemCode: finalItemCode });
      if (existing) {
        return sendError(res, 'Item code already exists', 400);
      }
    }

    const item = await InventoryItem.create({
      itemName,
      itemCode: finalItemCode,
      description,
      category,
      itemType,
      unitOfMeasurement,
      brand,
      model,
      specifications,
      minimumStockLevel: minimumStockLevel || 0,
      maximumStockLevel: maximumStockLevel || 0,
      reorderLevel: reorderLevel || 0,
      unitCost: unitCost || 0,
      currency: currency || 'ETB',
      preferredSupplier: preferredSupplier || null,
      image,
      attachments: attachments || [],
      status: status || 'active'
    });

    const populated = await item.populate([
      { path: 'category', select: 'name categoryType' },
      { path: 'preferredSupplier', select: 'supplierName supplierCode contactPerson phoneNumber' }
    ]);

    await recordAudit({
      item: item._id,
      action: 'created',
      newValues: item.toObject(),
      performedBy: req.user?._id,
      reason: 'Initial item creation'
    });

    return sendSuccess(res, 'Inventory item created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create inventory item', 500, error);
  }
};

// Get items with filters, search, pagination
export const getItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      itemType,
      preferredSupplier,
      status,
      includeDeleted = 'false'
    } = req.query;

    const query = {};
    if (includeDeleted !== 'true') query.isDeleted = false;
    if (category) query.category = category;
    if (itemType) query.itemType = itemType;
    if (preferredSupplier) query.preferredSupplier = preferredSupplier;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await InventoryItem.countDocuments(query);
    const items = await InventoryItem.find(query)
      .populate('category', 'name categoryType')
      .populate('preferredSupplier', 'supplierName supplierCode contactPerson')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Inventory items fetched successfully', items, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch inventory items', 500, error);
  }
};

// Get single item by ID with stock across warehouses
export const getItemById = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate('category', 'name categoryType')
      .populate('preferredSupplier', 'supplierName supplierCode contactPerson email phoneNumber paymentTerms');

    if (!item) {
      return sendError(res, 'Inventory item not found', 404);
    }

    // Also fetch stock balances across warehouses
    const stockBalances = await StockBalance.find({ item: item._id }).populate(
      'warehouse',
      'warehouseName warehouseCode branch'
    );

    const totalOnHand = stockBalances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);
    const totalAvailable = stockBalances.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
    const totalReserved = stockBalances.reduce((sum, b) => sum + (b.reservedQuantity || 0), 0);

    return sendSuccess(res, 'Inventory item retrieved successfully', {
      ...item.toObject(),
      stockBalances,
      totals: {
        totalOnHand,
        totalAvailable,
        totalReserved
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to retrieve inventory item', 500, error);
  }
};

// Update item
export const updateItem = async (req, res) => {
  try {
    const previous = await InventoryItem.findById(req.params.id);
    if (!previous) {
      return sendError(res, 'Inventory item not found', 404);
    }

    const updates = { ...req.body };
    if (updates.itemCode) {
      updates.itemCode = updates.itemCode.toUpperCase().trim();
      const duplicate = await InventoryItem.findOne({
        itemCode: updates.itemCode,
        _id: { $ne: req.params.id }
      });
      if (duplicate) {
        return sendError(res, 'Another item already has this item code', 400);
      }
    }

    const item = await InventoryItem.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    })
      .populate('category', 'name categoryType')
      .populate('preferredSupplier', 'supplierName supplierCode contactPerson');

    await recordAudit({
      item: item._id,
      action: 'updated',
      previousValues: previous.toObject(),
      newValues: item.toObject(),
      performedBy: req.user?._id,
      reason: 'Item updated'
    });

    return sendSuccess(res, 'Inventory item updated successfully', item);
  } catch (error) {
    return sendError(res, 'Failed to update inventory item', 500, error);
  }
};

// Soft delete item
export const deleteItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, status: 'inactive' },
      { new: true }
    );
    if (!item) {
      return sendError(res, 'Inventory item not found', 404);
    }

    await recordAudit({
      item: item._id,
      action: 'deleted',
      performedBy: req.user?._id,
      reason: 'Item soft deleted'
    });

    return sendSuccess(res, 'Inventory item deactivated successfully', item);
  } catch (error) {
    return sendError(res, 'Failed to delete inventory item', 500, error);
  }
};

