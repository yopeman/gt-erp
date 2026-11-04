import Supplier from '../models/Supplier.js';
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

