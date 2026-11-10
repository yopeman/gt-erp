import ProductionWastage from '../models/ProductionWastage.js';
import ProductionJob from '../models/ProductionJob.js';
import Order from '../models/Order.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Get wastage logs
export const getWastages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      productionJob,
      order,
      status,
      wasteCategory
    } = req.query;

    const query = { isDeleted: false };

    if (search) {
      query.wastageNumber = { $regex: search.trim(), $options: 'i' };
    }

    if (productionJob && productionJob !== 'all') {
      query.productionJob = productionJob;
    }

    if (order && order !== 'all') {
      query.order = order;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (wasteCategory && wasteCategory !== 'all') {
      query.wasteCategory = wasteCategory;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await ProductionWastage.countDocuments(query);

    const wastages = await ProductionWastage.find(query)
      .populate('productionJob', 'jobOrderNumber targetQuantity producedQuantity status')
      .populate('order', 'orderNumber title')
      .populate('machine', 'machineCode name')
      .populate('operator', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName employeeId')
      .populate('items.materialItem', 'itemCode itemName unit costPrice')
      .sort({ recordedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Production wastage records retrieved', {
      wastages,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch wastage records', 500, error);
  }
};

// Get single wastage record
export const getWastageById = async (req, res) => {
  try {
    const { id } = req.params;
    const wastage = await ProductionWastage.findOne({ _id: id, isDeleted: false })
      .populate('productionJob')
      .populate('order')
      .populate('machine')
      .populate('operator')
      .populate('approvedBy')
      .populate('items.materialItem');

    if (!wastage) {
      return sendError(res, 'Wastage record not found', 404);
    }

    return sendSuccess(res, 'Wastage record retrieved successfully', wastage);
  } catch (error) {
    return sendError(res, 'Failed to retrieve wastage record', 500, error);
  }
};

// Record scrap / wastage
export const createWastage = async (req, res) => {
  try {
    const {
      productionJob: jobId,
      order: orderId,
      stageName,
      machine,
      operator,
      wasteCategory,
      items
    } = req.body;

    if (!jobId) {
      return sendError(res, 'Production job reference is required', 400);
    }

    if (!stageName) {
      return sendError(res, 'Stage name is required', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one waste item is required', 400);
    }

    const job = await ProductionJob.findById(jobId);
    if (!job) {
      return sendError(res, 'Production job not found', 404);
    }

    const resolvedOrderId = orderId || job.order;

    const wastage = await ProductionWastage.create({
      productionJob: job._id,
      order: resolvedOrderId,
      stageName: stageName.trim(),
      machine: machine || null,
      operator: operator || req.user?.employee?._id || req.user?.employee || null,
      wasteCategory: wasteCategory || 'raw_material',
      items,
      status: 'pending_review'
    });

    // Link wastage to ProductionJob and update cost rollup
    job.wastageRecords.push(wastage._id);
    job.costRollup = job.costRollup || {};
    job.costRollup.totalWastageCost = (job.costRollup.totalWastageCost || 0) + (wastage.totalWastageCost || 0);
    job.costRollup.totalActualCost = (job.costRollup.totalActualCost || 0) + (wastage.totalWastageCost || 0);

    // Sum defective quantity if defective products were reported
    let spoiledCount = 0;
    items.forEach((itm) => {
      if (itm.unitOfMeasurement === 'copy' || itm.unitOfMeasurement === 'sheet') {
        spoiledCount += Number(itm.quantity || 0);
      }
    });
    job.defectiveQuantity = (job.defectiveQuantity || 0) + spoiledCount;

    await job.save();

    const populated = await ProductionWastage.findById(wastage._id)
      .populate('productionJob', 'jobOrderNumber targetQuantity')
      .populate('items.materialItem', 'itemCode itemName unit');

    return sendSuccess(res, 'Production wastage logged successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to log wastage', 500, error);
  }
};

// Approve wastage report
export const approveWastage = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'approved' } = req.body;

    const wastage = await ProductionWastage.findOne({ _id: id, isDeleted: false });
    if (!wastage) {
      return sendError(res, 'Wastage record not found', 404);
    }

    wastage.status = status;
    wastage.approvedBy = req.user?.employee?._id || req.user?.employee || null;
    wastage.approvedAt = new Date();
    await wastage.save();

    const populated = await ProductionWastage.findById(wastage._id)
      .populate('approvedBy', 'firstName lastName employeeId');

    return sendSuccess(res, `Wastage record marked as ${status}`, populated);
  } catch (error) {
    return sendError(res, 'Failed to approve wastage', 500, error);
  }
};

// Soft delete
export const deleteWastage = async (req, res) => {
  try {
    const { id } = req.params;
    const wastage = await ProductionWastage.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!wastage) {
      return sendError(res, 'Wastage record not found', 404);
    }

    return sendSuccess(res, 'Wastage record deleted', { id: wastage._id });
  } catch (error) {
    return sendError(res, 'Failed to delete wastage record', 500, error);
  }
};

