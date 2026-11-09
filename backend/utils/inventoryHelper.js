import StockBalance from '../models/StockBalance.js';
import StockMovement from '../models/StockMovement.js';
import InventoryAuditLog from '../models/InventoryAuditLog.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import InventoryItem from '../models/InventoryItem.js';

/**
 * Generate next sequential item code with prefix GT- (starting from GT-001)
 */
export const generateNextItemCode = async () => {
  const items = await InventoryItem.find(
    { itemCode: { $regex: /^GT-\d+$/i } },
    { itemCode: 1 }
  ).lean();

  let maxNumber = 0;
  for (const item of items) {
    const match = item.itemCode?.match(/^GT-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  let nextNumber = maxNumber + 1;
  let candidateCode = `GT-${String(nextNumber).padStart(3, '0')}`;

  while (await InventoryItem.exists({ itemCode: candidateCode })) {
    nextNumber++;
    candidateCode = `GT-${String(nextNumber).padStart(3, '0')}`;
  }

  return candidateCode;
};

/**
 * Generate a random unique document number with prefix and date
 * E.g., PO-202611-8492
 */
export const generateCode = (prefix = 'DOC') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomSuffix}`;
};

/**
 * Get or create a stock balance record for an item in a warehouse
 */
export const getOrCreateStockBalance = async (itemId, warehouseId) => {
  let balance = await StockBalance.findOne({ item: itemId, warehouse: warehouseId });
  if (!balance) {
    balance = new StockBalance({
      item: itemId,
      warehouse: warehouseId,
      quantityOnHand: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      damagedQuantity: 0
    });
    await balance.save();
  }
  return balance;
};

/**
 * Adjust stock balance quantities and update available quantity
 */
export const adjustStockBalance = async (
  itemId,
  warehouseId,
  { onHandDelta = 0, reservedDelta = 0, damagedDelta = 0 }
) => {
  const balance = await getOrCreateStockBalance(itemId, warehouseId);

  balance.quantityOnHand = Math.max(0, (balance.quantityOnHand || 0) + onHandDelta);
  balance.reservedQuantity = Math.max(0, (balance.reservedQuantity || 0) + reservedDelta);
  balance.damagedQuantity = Math.max(0, (balance.damagedQuantity || 0) + damagedDelta);
  balance.availableQuantity = Math.max(0, balance.quantityOnHand - balance.reservedQuantity);
  balance.lastStockMovementAt = new Date();

  await balance.save();
  return balance;
};

/**
 * Record a stock movement and automatically update the corresponding stock balance
 */
export const recordStockMovementWithBalance = async ({
  movementNumber,
  item,
  warehouse,
  movementType,
  quantity,
  unitCost = 0,
  referenceType = null,
  referenceId = null,
  reason = '',
  note = '',
  attachments = [],
  performedBy = null,
  performedByModel = 'User',
  approvedBy = null,
  approvedByModel = 'User',
  movementDate = new Date()
}) => {
  const code = movementNumber || generateCode('MOV');
  const validRefId = referenceId && typeof referenceId === 'string' && referenceId.trim() !== '' ? referenceId : (referenceId || null);

  const movement = await StockMovement.create({
    movementNumber: code,
    item,
    warehouse,
    movementType,
    quantity,
    unitCost,
    totalCost: Math.abs(quantity) * (unitCost || 0),
    referenceType,
    referenceId: validRefId,
    reason,
    note,
    attachments,
    performedBy: performedBy || null,
    performedByModel: performedByModel || 'User',
    approvedBy: approvedBy || null,
    approvedByModel: approvedByModel || 'User',
    movementDate
  });

  // Calculate stock balance impact based on movement type
  let onHandDelta = 0;
  let damagedDelta = 0;

  switch (movementType) {
    case 'purchase receipt':
    case 'stock transfer in':
    case 'return':
      onHandDelta = Math.abs(quantity);
      break;

    case 'stock issue':
    case 'stock transfer out':
      onHandDelta = -Math.abs(quantity);
      break;

    case 'adjustment':
      // Adjustment quantity can be positive or negative
      onHandDelta = quantity;
      break;

    case 'damaged':
      onHandDelta = -Math.abs(quantity);
      damagedDelta = Math.abs(quantity);
      break;

    default:
      onHandDelta = quantity;
  }

  await adjustStockBalance(item, warehouse, { onHandDelta, damagedDelta });

  return movement;
};

/**
 * Helper to record approval history
 */
export const recordApproval = async ({
  referenceType,
  referenceId,
  action,
  actionBy,
  comment = ''
}) => {
  return await ApprovalHistory.create({
    referenceType,
    referenceId,
    action,
    actionBy,
    comment,
    actionDate: new Date()
  });
};

/**
 * Helper to record inventory audit log
 */
export const recordAudit = async ({
  item = null,
  warehouse = null,
  action,
  previousValues = null,
  newValues = null,
  performedBy = null,
  reason = ''
}) => {
  return await InventoryAuditLog.create({
    item,
    warehouse,
    action,
    previousValues,
    newValues,
    performedBy,
    reason
  });
};

