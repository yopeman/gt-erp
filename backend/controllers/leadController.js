import Lead from '../models/Lead.js';
import Customer from '../models/Customer.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Create a new lead
export const createLead = async (req, res) => {
  try {
    const {
      name,
      companyName,
      phone,
      email,
      source,
      category,
      priority,
      estimatedValue,
      currency,
      assignedTo,
      requirements,
      discussions
    } = req.body;

    if (!name || !phone) {
      return sendError(res, 'Name and phone number are required', 400);
    }

    const leadNumber = req.body.leadNumber?.trim() || generateCode('LED');

    const existingLead = await Lead.findOne({ leadNumber });
    if (existingLead) {
      return sendError(res, 'Lead number already exists', 400);
    }

    const lead = await Lead.create({
      leadNumber,
      name: name.trim(),
      companyName: companyName?.trim() || '',
      phone: phone.trim(),
      email: email?.trim().toLowerCase() || '',
      source: source || 'walk_in',
      category: category || 'corporate',
      status: 'new',
      priority: priority || 'medium',
      estimatedValue: Number(estimatedValue || 0),
      currency: currency || 'ETB',
      assignedTo: assignedTo || null,
      requirements: requirements?.trim() || '',
      discussions: discussions || [],
      createdBy: req.user?._id || null
    });

    const populated = await Lead.findById(lead._id).populate('assignedTo', 'fullName employeeCode firstName lastName employeeId position');

    return sendSuccess(res, 'Lead created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create lead', 500, error);
  }
};

// Get leads with filters & search
export const getLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      category,
      source,
      priority,
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { leadNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (source && source !== 'all') {
      query.source = source;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'fullName employeeCode firstName lastName employeeId position department')
        .populate('convertedCustomerId', 'customerNumber name companyName')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Lead.countDocuments(query)
    ]);

    return sendSuccess(res, 'Leads retrieved successfully', {
      leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch leads', 500, error);
  }
};

// Get single lead by ID
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id)
      .populate('assignedTo', 'fullName employeeCode firstName lastName employeeId position department email phone')
      .populate('convertedCustomerId', 'customerNumber name companyName creditTerms tinNumber')
      .populate('discussions.recordedBy', 'fullName employeeCode firstName lastName employeeId')
      .populate('createdBy', 'fullName email');

    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    return sendSuccess(res, 'Lead retrieved successfully', lead);
  } catch (error) {
    return sendError(res, 'Failed to fetch lead', 500, error);
  }
};

// Update lead
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      companyName,
      phone,
      email,
      source,
      category,
      status,
      priority,
      estimatedValue,
      currency,
      assignedTo,
      requirements,
      lostReason
    } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    if (name) lead.name = name.trim();
    if (companyName !== undefined) lead.companyName = companyName.trim();
    if (phone) lead.phone = phone.trim();
    if (email !== undefined) lead.email = email.trim().toLowerCase();
    if (source) lead.source = source;
    if (category) lead.category = category;
    if (status) {
      lead.status = status;
      if (status === 'lost' && lostReason) {
        lead.lostReason = lostReason.trim();
      }
    }
    if (priority) lead.priority = priority;
    if (estimatedValue !== undefined) lead.estimatedValue = Number(estimatedValue);
    if (currency) lead.currency = currency;
    if (assignedTo !== undefined) lead.assignedTo = assignedTo || null;
    if (requirements !== undefined) lead.requirements = requirements.trim();
    if (lostReason !== undefined) lead.lostReason = lostReason.trim();

    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'fullName employeeCode firstName lastName employeeId position department')
      .populate('convertedCustomerId', 'customerNumber name companyName');

    return sendSuccess(res, 'Lead updated successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to update lead', 500, error);
  }
};

// Add discussion note to lead
export const addDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const { agenda, summary, nextFollowupDate, newStatus } = req.body;

    if (!summary) {
      return sendError(res, 'Discussion summary is required', 400);
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    const discussion = {
      date: new Date(),
      agenda: agenda?.trim() || '',
      summary: summary.trim(),
      nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
      recordedBy: req.user?.employee || null
    };

    lead.discussions.push(discussion);

    if (newStatus && lead.status !== 'converted') {
      lead.status = newStatus;
    } else if (lead.status === 'new') {
      lead.status = 'contacted';
    }

    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'fullName employeeCode firstName lastName employeeId position department')
      .populate('discussions.recordedBy', 'fullName employeeCode firstName lastName employeeId');

    return sendSuccess(res, 'Discussion added successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to add discussion', 500, error);
  }
};

// Convert lead to formal customer
export const convertLeadToCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      creditLimit = 0,
      creditTermDays = 0,
      allowedCredit = false,
      tinNumber = '',
      vatNumber = '',
      billingAddress,
      shippingAddress
    } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    if (lead.status === 'converted' && lead.convertedCustomerId) {
      return sendError(res, 'Lead has already been converted to a customer', 400);
    }

    const customerNumber = generateCode('CUST');

    // Create Customer from Lead profile
    const customer = await Customer.create({
      customerNumber,
      name: lead.companyName || lead.name,
      companyName: lead.companyName || '',
      category: lead.category === 'sme' ? 'company' : lead.category === 'corporate' ? 'corporation' : lead.category,
      tinNumber: tinNumber || '',
      vatNumber: vatNumber || '',
      contactPersons: [
        {
          name: lead.name,
          position: 'Primary Contact',
          phone: lead.phone,
          email: lead.email || '',
          isPrimary: true
        }
      ],
      billingAddress: billingAddress || { city: 'Addis Ababa', country: 'Ethiopia' },
      shippingAddress: shippingAddress || { city: 'Addis Ababa' },
      source: 'lead_conversion',
      creditTerms: {
        allowedCredit: Boolean(allowedCredit),
        creditLimit: Number(creditLimit || 0),
        creditTermDays: Number(creditTermDays || 0),
        currentBalance: 0
      },
      assignedSalesRepresentative: lead.assignedTo || null,
      status: 'active',
      notes: `Converted from lead ${lead.leadNumber}. Requirements: ${lead.requirements || 'N/A'}`,
      createdBy: req.user?._id || null
    });

    // Update Lead status
    lead.status = 'converted';
    lead.convertedCustomerId = customer._id;
    lead.convertedAt = new Date();
    await lead.save();

    return sendSuccess(
      res,
      'Lead successfully converted to customer',
      {
        lead,
        customer
      },
      201
    );
  } catch (error) {
    return sendError(res, 'Failed to convert lead to customer', 500, error);
  }
};

// Delete lead
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    if (lead.status === 'converted') {
      return sendError(res, 'Cannot delete an already converted lead', 400);
    }

    await Lead.findByIdAndDelete(id);

    return sendSuccess(res, 'Lead deleted successfully', { id });
  } catch (error) {
    return sendError(res, 'Failed to delete lead', 500, error);
  }
};

// Lead Pipeline Statistics for Dashboard
export const getLeadStatistics = async (req, res) => {
  try {
    const [totalLeads, newLeads, contacted, qualified, proposalSent, converted, lost, totalPipeline] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ status: 'new' }),
      Lead.countDocuments({ status: 'contacted' }),
      Lead.countDocuments({ status: 'qualified' }),
      Lead.countDocuments({ status: 'proposal_sent' }),
      Lead.countDocuments({ status: 'converted' }),
      Lead.countDocuments({ status: 'lost' }),
      Lead.aggregate([
        { $match: { status: { $nin: ['converted', 'lost'] } } },
        { $group: { _id: null, totalValue: { $sum: '$estimatedValue' } } }
      ])
    ]);

    const stats = {
      totalLeads,
      statusBreakdown: {
        new: newLeads,
        contacted,
        qualified,
        proposalSent,
        converted,
        lost
      },
      activePipelineCount: newLeads + contacted + qualified + proposalSent,
      activePipelineValue: totalPipeline[0]?.totalValue || 0,
      conversionRate: totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0
    };

    return sendSuccess(res, 'Lead statistics retrieved successfully', stats);
  } catch (error) {
    return sendError(res, 'Failed to get lead statistics', 500, error);
  }
};

