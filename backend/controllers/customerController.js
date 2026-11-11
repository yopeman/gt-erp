import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Followup from '../models/Followup.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Create a new customer
export const createCustomer = async (req, res) => {
  try {
    const {
      name,
      companyName,
      category,
      tinNumber,
      vatNumber,
      contactPersons,
      billingAddress,
      shippingAddress,
      source,
      creditTerms,
      assignedSalesRepresentative,
      customAttributes,
      notes
    } = req.body;

    if (!name) {
      return sendError(res, 'Customer name is required', 400);
    }

    const customerNumber = req.body.customerNumber?.trim() || generateCode('CUST');

    const existingCustomer = await Customer.findOne({ customerNumber });
    if (existingCustomer) {
      return sendError(res, 'Customer number already exists', 400);
    }

    const customer = await Customer.create({
      customerNumber,
      name: name.trim(),
      companyName: companyName?.trim() || '',
      category: category || 'company',
      tinNumber: tinNumber?.trim() || '',
      vatNumber: vatNumber?.trim() || '',
      contactPersons: contactPersons || [],
      billingAddress: billingAddress || { city: 'Addis Ababa', country: 'Ethiopia' },
      shippingAddress: shippingAddress || { city: 'Addis Ababa' },
      source: source || 'direct_walk_in',
      creditTerms: {
        allowedCredit: Boolean(creditTerms?.allowedCredit),
        creditLimit: Number(creditTerms?.creditLimit || 0),
        creditTermDays: Number(creditTerms?.creditTermDays || 0),
        currentBalance: 0
      },
      assignedSalesRepresentative: assignedSalesRepresentative || null,
      customAttributes: customAttributes || [],
      status: 'active',
      notes: notes?.trim() || '',
      createdBy: req.user?._id || null
    });

    const populated = await Customer.findById(customer._id)
      .populate('assignedSalesRepresentative', 'fullName employeeCode firstName lastName employeeId position department');

    return sendSuccess(res, 'Customer created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create customer', 500, error);
  }
};

// Get customers with filters, search & pagination
export const getCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category,
      status,
      assignedSalesRepresentative,
      allowedCredit,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { tinNumber: { $regex: search, $options: 'i' } },
        { customerNumber: { $regex: search, $options: 'i' } },
        { 'contactPersons.phone': { $regex: search, $options: 'i' } },
        { 'contactPersons.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (assignedSalesRepresentative && assignedSalesRepresentative !== 'all') {
      query.assignedSalesRepresentative = assignedSalesRepresentative;
    }

    if (allowedCredit !== undefined && allowedCredit !== 'all') {
      query['creditTerms.allowedCredit'] = allowedCredit === 'true';
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate('assignedSalesRepresentative', 'fullName employeeCode firstName lastName employeeId position department email phone')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Customer.countDocuments(query)
    ]);

    return sendSuccess(res, 'Customers retrieved successfully', {
      customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch customers', 500, error);
  }
};

// Get single customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id)
      .populate('assignedSalesRepresentative', 'fullName employeeCode firstName lastName employeeId position department email phone')
      .populate('createdBy', 'fullName email');

    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    // Also fetch recent follow-ups for this customer
    const followups = await Followup.find({ customer: id })
      .populate('assignedTo', 'firstName lastName employeeId')
      .sort({ scheduledTime: -1 })
      .limit(10);

    return sendSuccess(res, 'Customer retrieved successfully', {
      ...customer.toObject(),
      recentFollowups: followups
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch customer', 500, error);
  }
};

// Update customer
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      companyName,
      category,
      tinNumber,
      vatNumber,
      contactPersons,
      billingAddress,
      shippingAddress,
      creditTerms,
      assignedSalesRepresentative,
      customAttributes,
      status,
      notes
    } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    if (name) customer.name = name.trim();
    if (companyName !== undefined) customer.companyName = companyName.trim();
    if (category) customer.category = category;
    if (tinNumber !== undefined) customer.tinNumber = tinNumber.trim();
    if (vatNumber !== undefined) customer.vatNumber = vatNumber.trim();
    if (contactPersons) customer.contactPersons = contactPersons;
    if (billingAddress) customer.billingAddress = { ...customer.billingAddress.toObject(), ...billingAddress };
    if (shippingAddress) customer.shippingAddress = { ...customer.shippingAddress.toObject(), ...shippingAddress };
    if (creditTerms) {
      if (creditTerms.allowedCredit !== undefined) customer.creditTerms.allowedCredit = Boolean(creditTerms.allowedCredit);
      if (creditTerms.creditLimit !== undefined) customer.creditTerms.creditLimit = Number(creditTerms.creditLimit);
      if (creditTerms.creditTermDays !== undefined) customer.creditTerms.creditTermDays = Number(creditTerms.creditTermDays);
      if (creditTerms.currentBalance !== undefined) customer.creditTerms.currentBalance = Number(creditTerms.currentBalance);
    }
    if (assignedSalesRepresentative !== undefined) {
      customer.assignedSalesRepresentative = assignedSalesRepresentative || null;
    }
    if (customAttributes) customer.customAttributes = customAttributes;
    if (status) customer.status = status;
    if (notes !== undefined) customer.notes = notes.trim();

    await customer.save();

    const populated = await Customer.findById(customer._id)
      .populate('assignedSalesRepresentative', 'fullName employeeCode firstName lastName employeeId position department');

    return sendSuccess(res, 'Customer updated successfully', populated);
  } catch (error) {
    return sendError(res, 'Failed to update customer', 500, error);
  }
};

// Update credit terms specifically
export const updateCreditTerms = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowedCredit, creditLimit, creditTermDays } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    if (allowedCredit !== undefined) customer.creditTerms.allowedCredit = Boolean(allowedCredit);
    if (creditLimit !== undefined) customer.creditTerms.creditLimit = Number(creditLimit);
    if (creditTermDays !== undefined) customer.creditTerms.creditTermDays = Number(creditTermDays);

    await customer.save();

    return sendSuccess(res, 'Credit terms updated successfully', customer.creditTerms);
  } catch (error) {
    return sendError(res, 'Failed to update credit terms', 500, error);
  }
};

// Delete customer (soft or hard check)
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    if (customer.creditTerms.currentBalance > 0) {
      return sendError(res, 'Cannot delete a customer with an active outstanding credit balance', 400);
    }

    await Customer.findByIdAndDelete(id);

    return sendSuccess(res, 'Customer deleted successfully', { id });
  } catch (error) {
    return sendError(res, 'Failed to delete customer', 500, error);
  }
};

// Customer Overview Metrics for Dashboard
export const getCustomerMetrics = async (req, res) => {
  try {
    const [totalCustomers, activeCustomers, corporateCustomers, creditAllowed, totalReceivables] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'active' }),
      Customer.countDocuments({ category: { $in: ['company', 'corporation'] } }),
      Customer.countDocuments({ 'creditTerms.allowedCredit': true }),
      Customer.aggregate([
        { $group: { _id: null, totalOutstanding: { $sum: '$creditTerms.currentBalance' } } }
      ])
    ]);

    const metrics = {
      totalCustomers,
      activeCustomers,
      corporateCustomers,
      creditAllowed,
      totalOutstandingReceivables: totalReceivables[0]?.totalOutstanding || 0
    };

    return sendSuccess(res, 'Customer metrics retrieved successfully', metrics);
  } catch (error) {
    return sendError(res, 'Failed to get customer metrics', 500, error);
  }
};

