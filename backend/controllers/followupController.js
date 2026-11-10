import Followup from '../models/Followup.js';
import Lead from '../models/Lead.js';
import Customer from '../models/Customer.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Create a new follow-up
export const createFollowup = async (req, res) => {
  try {
    const {
      lead,
      customer,
      type,
      agenda,
      scheduledTime,
      priority,
      assignedTo,
      nextActionDate
    } = req.body;

    if (!agenda || !scheduledTime || !assignedTo) {
      return sendError(res, 'Agenda, scheduled time, and assigned employee are required', 400);
    }

    if (!lead && !customer) {
      return sendError(res, 'Either a Lead or a Customer reference must be provided', 400);
    }

    const followupNumber = req.body.followupNumber?.trim() || generateCode('FLW');

    const followup = await Followup.create({
      followupNumber,
      lead: lead || null,
      customer: customer || null,
      type: type || 'phone_call',
      agenda: agenda.trim(),
      scheduledTime: new Date(scheduledTime),
      priority: priority || 'medium',
      status: 'scheduled',
      assignedTo,
      nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
      createdBy: req.user?._id || null
    });

    const populated = await Followup.findById(followup._id)
      .populate('lead', 'leadNumber name companyName phone email status')
      .populate('customer', 'customerNumber name companyName tinNumber')
      .populate('assignedTo', 'firstName lastName employeeId position department');

    return sendSuccess(res, 'Follow-up scheduled successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create follow-up', 500, error);
  }
};

// Get follow-ups with filters & date scopes
export const getFollowups = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      lead,
      customer,
      assignedTo,
      status,
      type,
      priority,
      scope, // 'today', 'upcoming', 'overdue', 'all'
      search = '',
      sortBy = 'scheduledTime',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    if (lead) query.lead = lead;
    if (customer) query.customer = customer;
    if (assignedTo && assignedTo !== 'all') query.assignedTo = assignedTo;
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (priority && priority !== 'all') query.priority = priority;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (scope === 'today') {
      query.scheduledTime = { $gte: startOfToday, $lte: endOfToday };
    } else if (scope === 'upcoming') {
      query.scheduledTime = { $gt: endOfToday };
      if (!status) query.status = 'scheduled';
    } else if (scope === 'overdue') {
      query.scheduledTime = { $lt: now };
      query.status = 'scheduled';
    }

    if (search) {
      query.$or = [
        { agenda: { $regex: search, $options: 'i' } },
        { result: { $regex: search, $options: 'i' } },
        { followupNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [followups, total] = await Promise.all([
      Followup.find(query)
        .populate('lead', 'leadNumber name companyName phone email status')
        .populate('customer', 'customerNumber name companyName tinNumber')
        .populate('assignedTo', 'firstName lastName employeeId position department email phone')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Followup.countDocuments(query)
    ]);

    return sendSuccess(res, 'Follow-ups retrieved successfully', {
      followups,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch follow-ups', 500, error);
  }
};

// Get single follow-up by ID
export const getFollowupById = async (req, res) => {
  try {
    const { id } = req.params;

    const followup = await Followup.findById(id)
      .populate('lead', 'leadNumber name companyName phone email status category requirements')
      .populate('customer', 'customerNumber name companyName tinNumber creditTerms')
      .populate('assignedTo', 'firstName lastName employeeId position department email phone')
      .populate('createdBy', 'fullName email');

    if (!followup) {
      return sendError(res, 'Follow-up not found', 404);
    }

    return sendSuccess(res, 'Follow-up retrieved successfully', followup);
  } catch (error) {
    return sendError(res, 'Failed to fetch follow-up', 500, error);
  }
};

// Update follow-up
export const updateFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      agenda,
      scheduledTime,
      priority,
      status,
      result,
      nextActionDate,
      assignedTo
    } = req.body;

    const followup = await Followup.findById(id);
    if (!followup) {
      return sendError(res, 'Follow-up not found', 404);
    }

    if (type) followup.type = type;
    if (agenda) followup.agenda = agenda.trim();
    if (scheduledTime) followup.scheduledTime = new Date(scheduledTime);
    if (priority) followup.priority = priority;
    if (status) followup.status = status;
    if (result !== undefined) followup.result = result.trim();
    if (nextActionDate !== undefined) followup.nextActionDate = nextActionDate ? new Date(nextActionDate) : null;
    if (assignedTo) followup.assignedTo = assignedTo;

    await followup.save();

    const populated = await Followup.findById(followup._id)
      .populate('lead', 'leadNumber name companyName phone email status')
      .populate('customer', 'customerNumber name companyName tinNumber')
      .populate('assignedTo', 'firstName lastName employeeId position department');

    return sendSuccess(res, 'Follow-up updated successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to update follow-up', 500, error);
  }
};

// Complete follow-up with outcome result
export const completeFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const { result, nextActionDate, scheduleNextFollowup, nextAgenda, nextScheduledTime } = req.body;

    if (!result) {
      return sendError(res, 'Follow-up result/outcome notes are required', 400);
    }

    const followup = await Followup.findById(id);
    if (!followup) {
      return sendError(res, 'Follow-up not found', 404);
    }

    followup.status = 'completed';
    followup.result = result.trim();
    if (nextActionDate) {
      followup.nextActionDate = new Date(nextActionDate);
    }
    await followup.save();

    let nextFollowup = null;
    if (scheduleNextFollowup && nextAgenda && nextScheduledTime) {
      nextFollowup = await Followup.create({
        followupNumber: generateCode('FLW'),
        lead: followup.lead,
        customer: followup.customer,
        type: followup.type,
        agenda: nextAgenda.trim(),
        scheduledTime: new Date(nextScheduledTime),
        priority: followup.priority,
        status: 'scheduled',
        assignedTo: followup.assignedTo,
        createdBy: req.user?._id || null
      });
    }

    const populated = await Followup.findById(followup._id)
      .populate('lead', 'leadNumber name companyName phone email status')
      .populate('customer', 'customerNumber name companyName tinNumber')
      .populate('assignedTo', 'firstName lastName employeeId position department');

    return sendSuccess(res, 'Follow-up marked as completed', {
      completedFollowup: populated,
      nextFollowup
    });
  } catch (error) {
    return sendError(res, 'Failed to complete follow-up', 500, error);
  }
};

// Delete follow-up
export const deleteFollowup = async (req, res) => {
  try {
    const { id } = req.params;

    const followup = await Followup.findByIdAndDelete(id);
    if (!followup) {
      return sendError(res, 'Follow-up not found', 404);
    }

    return sendSuccess(res, 'Follow-up deleted successfully', { id });
  } catch (error) {
    return sendError(res, 'Failed to delete follow-up', 500, error);
  }
};

// Follow-up Summary Metrics
export const getFollowupMetrics = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [todayCount, overdueCount, pendingCount, completedCount] = await Promise.all([
      Followup.countDocuments({
        scheduledTime: { $gte: startOfToday, $lte: endOfToday },
        status: 'scheduled'
      }),
      Followup.countDocuments({
        scheduledTime: { $lt: now },
        status: 'scheduled'
      }),
      Followup.countDocuments({ status: 'scheduled' }),
      Followup.countDocuments({ status: 'completed' })
    ]);

    return sendSuccess(res, 'Follow-up metrics retrieved successfully', {
      today: todayCount,
      overdue: overdueCount,
      pending: pendingCount,
      completed: completedCount
    });
  } catch (error) {
    return sendError(res, 'Failed to get follow-up metrics', 500, error);
  }
};

