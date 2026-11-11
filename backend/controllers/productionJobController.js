import ProductionJob from '../models/ProductionJob.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Service from '../models/Service.js';
import Machine from '../models/Machine.js';
import Employee from '../models/Employee.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const normalizeJobPriority = (p) => {
  if (!p) return 'normal';
  const val = String(p).toLowerCase().trim();
  if (val === 'medium' || val === 'low') return 'normal';
  if (['normal', 'high', 'urgent'].includes(val)) return val;
  return 'normal';
};

// Get production jobs with filtering and pagination
export const getProductionJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status,
      priority,
      customer,
      order
    } = req.query;

    const query = { isDeleted: false };

    if (search) {
      query.jobOrderNumber = { $regex: search.trim(), $options: 'i' };
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (customer && customer !== 'all') {
      query.customer = customer;
    }

    if (order && order !== 'all') {
      query.order = order;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await ProductionJob.countDocuments(query);

    const jobs = await ProductionJob.find(query)
      .populate('order', 'orderNumber title orderStatus priority deliveryDate')
      .populate('customer', 'name companyName contactPerson phone email')
      .populate('service', 'name serviceCode category')
      .populate('stages.machine', 'machineCode name hourlyCostRate status')
      .populate('stages.operators', 'fullName employeeCode firstName lastName employeeId position')
      .populate('stages.qcInspector', 'fullName employeeCode firstName lastName employeeId')
      .sort({ scheduledStartDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Production jobs retrieved successfully', {
      jobs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch production jobs', 500, error);
  }
};

// Get single production job by ID
export const getProductionJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await ProductionJob.findOne({ _id: id, isDeleted: false })
      .populate('order')
      .populate('customer')
      .populate('service')
      .populate('stages.machine', 'machineCode name hourlyCostRate status category')
      .populate('stages.operators', 'fullName employeeCode firstName lastName employeeId phone position')
      .populate('stages.qcInspector', 'fullName employeeCode firstName lastName employeeId phone')
      .populate('actualMaterialsConsumed.item', 'itemCode itemName unit costPrice currentStock')
      .populate({
        path: 'wastageRecords',
        populate: [
          { path: 'items.materialItem', select: 'itemCode itemName unit' },
          { path: 'operator', select: 'fullName employeeCode firstName lastName employeeId' },
          { path: 'machine', select: 'machineCode name' }
        ]
      })
      .populate('createdBy', 'name email');

    if (!job) {
      return sendError(res, 'Production job not found', 404);
    }

    return sendSuccess(res, 'Production job retrieved successfully', job);
  } catch (error) {
    return sendError(res, 'Failed to retrieve production job', 500, error);
  }
};

// Create a new job order (instantiates workflow stages from Service template if not manually provided)
export const createProductionJob = async (req, res) => {
  try {
    const {
      jobOrderNumber,
      order: orderId,
      customer: customerId,
      service: serviceId,
      priority,
      targetQuantity,
      scheduledStartDate,
      scheduledCompletionDate,
      stages,
      remarks
    } = req.body;

    if (!orderId) {
      return sendError(res, 'Sales order is required', 400);
    }

    if (!targetQuantity || targetQuantity <= 0) {
      return sendError(res, 'Target quantity must be greater than 0', 400);
    }

    const orderDoc = await Order.findById(orderId).populate('customer');
    if (!orderDoc) {
      return sendError(res, 'Sales order not found', 404);
    }

    const custId = customerId || orderDoc.customer?._id || orderDoc.customer;
    let srvId = serviceId;
    let orderItem = null;

    if (!srvId && Array.isArray(orderDoc.items) && orderDoc.items.length > 0) {
      orderItem = orderDoc.items[0];
      srvId = orderItem.service;
    }

    const serviceDoc = srvId ? await Service.findById(srvId) : null;

    // Build stages from Service workflowTemplate if not explicitly provided
    let finalStages = stages;
    if (!Array.isArray(finalStages) || finalStages.length === 0) {
      if (serviceDoc && Array.isArray(serviceDoc.workflowTemplate) && serviceDoc.workflowTemplate.length > 0) {
        finalStages = serviceDoc.workflowTemplate.map((step, idx) => ({
          sequence: typeof step.sequence === 'number' && step.sequence > 0 ? step.sequence : (idx + 1),
          stageName: step.stageName || `Stage ${idx + 1}`,
          machine: step.preferredMachine || null,
          operators: [],
          hoursRun: 0,
          machineCost: 0,
          completedQuantity: 0,
          status: 'pending',
          notes: step.description || ''
        }));
      } else {
        // Standard printing stages fallback
        finalStages = [
          { sequence: 1, stageName: 'Pre-press / CTP Plates', status: 'pending' },
          { sequence: 2, stageName: 'Printing / Press Run', status: 'pending' },
          { sequence: 3, stageName: 'Finishing & Cutting', status: 'pending' },
          { sequence: 4, stageName: 'Quality Inspection & Packaging', status: 'pending' }
        ];
      }
    } else {
      finalStages = finalStages.map((stg, idx) => ({
        ...stg,
        sequence: typeof stg.sequence === 'number' && stg.sequence > 0 ? stg.sequence : (idx + 1),
        stageName: stg.stageName || `Stage ${idx + 1}`,
        status: stg.status || 'pending'
      }));
    }

    const job = await ProductionJob.create({
      jobOrderNumber: jobOrderNumber ? jobOrderNumber.trim().toUpperCase() : undefined,
      order: orderDoc._id,
      customer: custId,
      service: srvId,
      priority: normalizeJobPriority(priority || orderDoc.priority),
      targetQuantity: Number(targetQuantity),
      scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : new Date(),
      scheduledCompletionDate: scheduledCompletionDate
        ? new Date(scheduledCompletionDate)
        : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      stages: finalStages,
      status: 'scheduled',
      remarks: remarks?.trim() || '',
      createdBy: req.user?._id || null
    });

    // Update order status to in_production
    orderDoc.orderStatus = 'in_production';
    await orderDoc.save();

    const populated = await ProductionJob.findById(job._id)
      .populate('order', 'orderNumber title')
      .populate('customer', 'companyName contactPerson')
      .populate('service', 'name serviceCode');

    return sendSuccess(res, 'Production job created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create production job', 500, error);
  }
};

// Start a stage in a production job
export const startStage = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const { machine: machineId, operators } = req.body;

    const job = await ProductionJob.findOne({ _id: id, isDeleted: false });
    if (!job) {
      return sendError(res, 'Production job not found', 404);
    }

    const stage = job.stages.id(stageId);
    if (!stage) {
      return sendError(res, 'Production stage not found', 404);
    }

    stage.status = 'in_progress';
    stage.actualStartTime = new Date();

    if (machineId) {
      stage.machine = machineId;
      // Mark machine as running
      await Machine.updateOne(
        { _id: machineId },
        { $set: { status: 'running' } }
      );
    }

    if (Array.isArray(operators) && operators.length > 0) {
      stage.operators = operators;
    }

    if (job.status === 'scheduled') {
      job.status = 'in_production';
    }
    if (!job.actualStartDate) {
      job.actualStartDate = new Date();
    }

    await job.save();

    const populated = await ProductionJob.findById(job._id)
      .populate('stages.machine', 'machineCode name hourlyCostRate status')
      .populate('stages.operators', 'fullName employeeCode firstName lastName employeeId position');

    return sendSuccess(res, `Stage "${stage.stageName}" started`, populated);
  } catch (error) {
    return sendError(res, 'Failed to start stage', 500, error);
  }
};

// Complete a stage
export const completeStage = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const { hoursRun = 0, completedQuantity = 0, notes } = req.body;

    const job = await ProductionJob.findOne({ _id: id, isDeleted: false });
    if (!job) {
      return sendError(res, 'Production job not found', 404);
    }

    const stage = job.stages.id(stageId);
    if (!stage) {
      return sendError(res, 'Production stage not found', 404);
    }

    stage.status = 'completed';
    stage.actualEndTime = new Date();
    stage.hoursRun = Number(hoursRun || 0);
    stage.completedQuantity = Number(completedQuantity || job.targetQuantity);
    if (notes !== undefined) stage.notes = notes.trim();

    // Calculate machine cost if stage has machine
    if (stage.machine) {
      const machineDoc = await Machine.findById(stage.machine);
      if (machineDoc) {
        stage.machineCost = Number(((stage.hoursRun || 0) * (machineDoc.hourlyCostRate || 0)).toFixed(2));
        // Restore machine status to available
        machineDoc.status = 'available';
        machineDoc.totalOperatingHours = (machineDoc.totalOperatingHours || 0) + stage.hoursRun;
        await machineDoc.save();
      }
    }

    // Check if all stages are completed
    const allCompleted = job.stages.every((s) => s.status === 'completed' || s.status === 'skipped');
    if (allCompleted) {
      job.status = 'qc_check';
    }

    await job.save();

    const populated = await ProductionJob.findById(job._id)
      .populate('stages.machine', 'machineCode name hourlyCostRate status')
      .populate('stages.operators', 'fullName employeeCode firstName lastName employeeId position');

    return sendSuccess(res, `Stage "${stage.stageName}" marked as completed`, populated);
  } catch (error) {
    return sendError(res, 'Failed to complete stage', 500, error);
  }
};

// Sign off Quality Inspection (QC) on a stage or final delivery
export const signoffQC = async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const { qcInspector, passed = true, producedQuantity, defectiveQuantity, notes } = req.body;

    const job = await ProductionJob.findOne({ _id: id, isDeleted: false });
    if (!job) {
      return sendError(res, 'Production job not found', 404);
    }

    const stage = job.stages.id(stageId);
    if (!stage) {
      return sendError(res, 'Production stage not found', 404);
    }

    stage.qcPassed = Boolean(passed);
    stage.qcInspector = qcInspector || req.user?.employee?._id || req.user?.employee || null;
    if (notes !== undefined) stage.notes = notes.trim();

    // If final stage or all stages passed QC
    if (producedQuantity !== undefined) {
      job.producedQuantity = Number(producedQuantity);
    }
    if (defectiveQuantity !== undefined) {
      job.defectiveQuantity = Number(defectiveQuantity);
    }

    const allCompleted = job.stages.every((s) => s.status === 'completed' || s.status === 'skipped');
    if (allCompleted && stage.qcPassed) {
      job.status = 'completed';
      job.actualCompletionDate = new Date();

      // Update Sales Order to completed
      await Order.updateOne(
        { _id: job.order },
        { $set: { orderStatus: 'completed' } }
      );
    }

    await job.save();

    const populated = await ProductionJob.findById(job._id)
      .populate('stages.qcInspector', 'fullName employeeCode firstName lastName employeeId');

    return sendSuccess(res, 'Quality inspection sign-off saved', populated);
  } catch (error) {
    return sendError(res, 'Failed to save QC sign-off', 500, error);
  }
};

// General Update
export const updateProductionJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await ProductionJob.findOne({ _id: id, isDeleted: false });

    if (!job) {
      return sendError(res, 'Production job not found', 404);
    }

    const {
      priority,
      targetQuantity,
      producedQuantity,
      defectiveQuantity,
      scheduledStartDate,
      scheduledCompletionDate,
      status,
      remarks,
      actualMaterialsConsumed
    } = req.body;

    if (priority) job.priority = normalizeJobPriority(priority);
    if (targetQuantity !== undefined) job.targetQuantity = Number(targetQuantity);
    if (producedQuantity !== undefined) job.producedQuantity = Number(producedQuantity);
    if (defectiveQuantity !== undefined) job.defectiveQuantity = Number(defectiveQuantity);
    if (scheduledStartDate) job.scheduledStartDate = new Date(scheduledStartDate);
    if (scheduledCompletionDate) job.scheduledCompletionDate = new Date(scheduledCompletionDate);
    if (status) job.status = status;
    if (remarks !== undefined) job.remarks = remarks.trim();
    if (Array.isArray(actualMaterialsConsumed)) job.actualMaterialsConsumed = actualMaterialsConsumed;

    await job.save();

    return sendSuccess(res, 'Production job updated successfully', job);
  } catch (error) {
    return sendError(res, 'Failed to update production job', 500, error);
  }
};

// Aggregated production dashboard metrics
export const getProductionDashboardMetrics = async (req, res) => {
  try {
    const [
      totalJobs,
      inProductionJobs,
      qcJobs,
      completedJobs,
      machinesRunning,
      totalMachines,
      activeBreakdowns
    ] = await Promise.all([
      ProductionJob.countDocuments({ isDeleted: false }),
      ProductionJob.countDocuments({ isDeleted: false, status: 'in_production' }),
      ProductionJob.countDocuments({ isDeleted: false, status: 'qc_check' }),
      ProductionJob.countDocuments({ isDeleted: false, status: 'completed' }),
      Machine.countDocuments({ isDeleted: false, status: 'running' }),
      Machine.countDocuments({ isDeleted: false, isDeleted: false }),
      Machine.countDocuments({ isDeleted: false, status: { $in: ['breakdown', 'maintenance'] } })
    ]);

    // Aggregate produced units vs defective units
    const volumeAgg = await ProductionJob.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalTarget: { $sum: '$targetQuantity' },
          totalProduced: { $sum: '$producedQuantity' },
          totalDefective: { $sum: '$defectiveQuantity' },
          totalActualCost: { $sum: '$costRollup.totalActualCost' }
        }
      }
    ]);

    const volume = volumeAgg[0] || {
      totalTarget: 0,
      totalProduced: 0,
      totalDefective: 0,
      totalActualCost: 0
    };

    const scrapRate =
      volume.totalTarget > 0
        ? Number(((volume.totalDefective / volume.totalTarget) * 100).toFixed(2))
        : 0;

    const utilizationRate =
      totalMachines > 0
        ? Number(((machinesRunning / totalMachines) * 100).toFixed(1))
        : 0;

    return sendSuccess(res, 'Production dashboard metrics retrieved', {
      totalJobs,
      inProductionJobs,
      qcJobs,
      completedJobs,
      machinesRunning,
      totalMachines,
      activeBreakdowns,
      utilizationRate,
      scrapRate,
      volume
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch production dashboard metrics', 500, error);
  }
};

// Soft delete
export const deleteProductionJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await ProductionJob.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!job) {
      return sendError(res, 'Production job not found', 404);
    }

    return sendSuccess(res, 'Production job deleted successfully', { id: job._id });
  } catch (error) {
    return sendError(res, 'Failed to delete production job', 500, error);
  }
};
