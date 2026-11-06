import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Create supplier
export const createSupplier = async (req, res) => {
  try {
    const {
      supplierName,
      supplierCode,
      companyName,
      contactPerson,
      email,
      phoneNumber,
      alternativePhone,
      address,
      city,
      country,
      tin,
      businessLicenseNumber,
      supplierType,
      suppliedItems,
      paymentTerms,
      creditLimit,
      creditPeriodDays,
      bankDetails,
      documents,
      rating,
      notes,
      status
    } = req.body;

    if (!supplierName || !supplierCode) {
      return sendError(res, 'Supplier name and code are required', 400);
    }

    const existing = await Supplier.findOne({ supplierCode: supplierCode.toUpperCase().trim() });
    if (existing) {
      return sendError(res, 'Supplier code already exists', 400);
    }

    const supplier = await Supplier.create({
      supplierName,
      supplierCode: supplierCode.toUpperCase().trim(),
      companyName,
      contactPerson,
      email,
      phoneNumber,
      alternativePhone,
      address,
      city,
      country,
      tin,
      businessLicenseNumber,
      supplierType,
      suppliedItems: suppliedItems || [],
      paymentTerms: paymentTerms || 'cash',
      creditLimit: Number(creditLimit || 0),
      creditPeriodDays: Number(creditPeriodDays || 30),
      bankDetails: bankDetails || [],
      documents: documents || [],
      rating: rating || 0,
      notes,
      status: status || 'active'
    });

    const populated = await supplier.populate('suppliedItems', 'itemName itemCode unitOfMeasurement');

    return sendSuccess(res, 'Supplier created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create supplier', 500, error);
  }
};

// Get suppliers with search & filters
export const getSuppliers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      supplierType,
      paymentTerms,
      status,
      includeDeleted = 'false'
    } = req.query;

    const query = {};
    if (includeDeleted !== 'true') query.isDeleted = false;
    if (supplierType) query.supplierType = supplierType;
    if (paymentTerms) query.paymentTerms = paymentTerms;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { supplierName: { $regex: search, $options: 'i' } },
        { supplierCode: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query)
      .populate('suppliedItems', 'itemName itemCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Suppliers fetched successfully', suppliers, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch suppliers', 500, error);
  }
};

// Get single supplier
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).populate(
      'suppliedItems',
      'itemName itemCode unitOfMeasurement unitCost'
    );

    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }
    return sendSuccess(res, 'Supplier retrieved successfully', supplier);
  } catch (error) {
    return sendError(res, 'Failed to retrieve supplier', 500, error);
  }
};

// Update supplier
export const updateSupplier = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.supplierCode) {
      updates.supplierCode = updates.supplierCode.toUpperCase().trim();
      const duplicate = await Supplier.findOne({
        supplierCode: updates.supplierCode,
        _id: { $ne: req.params.id }
      });
      if (duplicate) {
        return sendError(res, 'Another supplier already has this code', 400);
      }
    }

    const supplier = await Supplier.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('suppliedItems', 'itemName itemCode');

    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }
    return sendSuccess(res, 'Supplier updated successfully', supplier);
  } catch (error) {
    return sendError(res, 'Failed to update supplier', 500, error);
  }
};

// Soft delete supplier
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, status: 'inactive' },
      { new: true }
    );
    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }
    return sendSuccess(res, 'Supplier deactivated successfully', supplier);
  } catch (error) {
    return sendError(res, 'Failed to delete supplier', 500, error);
  }
};

// Add document to supplier
export const addSupplierDocument = async (req, res) => {
  try {
    const { name, type, url, expiresAt } = req.body;
    if (!name || !url) {
      return sendError(res, 'Document name and URL are required', 400);
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }

    supplier.documents.push({
      name,
      type: type || 'other',
      url,
      uploadedBy: req.user?._id,
      uploadedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await supplier.save();
    return sendSuccess(res, 'Document added successfully', supplier.documents);
  } catch (error) {
    return sendError(res, 'Failed to add supplier document', 500, error);
  }
};

// Get credit summary and recalculate balance for a supplier
export const getSupplierCreditSummary = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return sendError(res, 'Supplier not found', 404);
    }

    // Find credit orders for this supplier (exclude cancelled/rejected)
    const orders = await PurchaseOrder.find({
      supplier: supplier._id,
      paymentType: 'credit',
      status: { $nin: ['cancelled', 'rejected'] }
    }).select('purchaseOrderNumber grandTotal paidAmount balanceDue paymentStatus paymentDueDate orderDate status');

    const now = new Date();
    let totalCreditPurchases = 0;
    let totalPaid = 0;
    let totalBalanceDue = 0;
    let overdueAmount = 0;
    let overdueOrdersCount = 0;
    let unpaidOrdersCount = 0;

    for (const order of orders) {
      totalCreditPurchases += order.grandTotal || 0;
      totalPaid += order.paidAmount || 0;
      totalBalanceDue += order.balanceDue || 0;

      if ((order.balanceDue || 0) > 0) {
        unpaidOrdersCount++;
        if (order.paymentDueDate && new Date(order.paymentDueDate) < now) {
          overdueAmount += order.balanceDue;
          overdueOrdersCount++;
        }
      }
    }

    // Keep supplier current credit balance synced
    supplier.currentCreditBalance = totalBalanceDue;
    await supplier.save();

    const limit = Number(supplier.creditLimit || 0);
    const availableCredit = limit > 0 ? Math.max(0, limit - totalBalanceDue) : null;
    const creditUtilizationPct = limit > 0 ? Number(((totalBalanceDue / limit) * 100).toFixed(1)) : null;

    const summary = {
      supplierId: supplier._id,
      supplierName: supplier.supplierName,
      supplierCode: supplier.supplierCode,
      paymentTerms: supplier.paymentTerms,
      creditLimit: limit,
      creditPeriodDays: supplier.creditPeriodDays || 30,
      currentCreditBalance: totalBalanceDue,
      availableCredit,
      creditUtilizationPct,
      creditLimitExceeded: limit > 0 && totalBalanceDue > limit,
      totalCreditPurchases,
      totalPaid,
      totalBalanceDue,
      overdueAmount,
      unpaidOrdersCount,
      overdueOrdersCount,
      activeOrders: orders
    };

    return sendSuccess(res, 'Supplier credit summary retrieved successfully', summary);
  } catch (error) {
    return sendError(res, 'Failed to retrieve supplier credit summary', 500, error);
  }
};


