import Design from '../models/Design.js';
import Order from '../models/Order.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Get designs with pagination & filters
export const getDesigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      assignedDesigner,
      search = ''
    } = req.query;

    const query = {};

    if (status && status !== 'all') query.status = status;
    if (assignedDesigner && assignedDesigner !== 'all') query.assignedDesigner = assignedDesigner;

    if (search) {
      query.$or = [
        { designNumber: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [designs, total] = await Promise.all([
      Design.find(query)
        .populate('order', 'orderNumber customer deliveryDeadline priority status items')
        .populate('assignedDesigner', 'firstName lastName employeeId department position')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Design.countDocuments(query)
    ]);

    return sendSuccess(res, 'Designs retrieved successfully', {
      designs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch designs', 500, error);
  }
};

// Get design by order ID
export const getDesignByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const design = await Design.findOne({ order: orderId })
      .populate('order', 'orderNumber deliveryDeadline priority status items customer')
      .populate('assignedDesigner', 'firstName lastName employeeId department position email phone');

    if (!design) {
      return sendError(res, 'Design record not found for this order', 404);
    }

    return sendSuccess(res, 'Design retrieved successfully', design);
  } catch (error) {
    return sendError(res, 'Failed to fetch design', 500, error);
  }
};

// Create or initialize a design assignment for an order
export const createDesign = async (req, res) => {
  try {
    const { orderId, assignedDesigner, specifications, remarks } = req.body;

    if (!orderId || !assignedDesigner) {
      return sendError(res, 'Order ID and assigned designer are required', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    const existing = await Design.findOne({ order: orderId });
    if (existing) {
      return sendError(res, 'A design proof record already exists for this order', 400);
    }

    const designNumber = generateCode('DSG');

    const design = await Design.create({
      designNumber,
      order: orderId,
      assignedDesigner,
      specifications: specifications || {
        bleedMm: 3,
        colorProfile: 'CMYK',
        resolutionDpi: 300,
        orientation: 'portrait'
      },
      status: 'in_design',
      remarks: remarks?.trim() || ''
    });

    order.design = design._id;
    order.status = 'design_in_progress';
    await order.save();

    const populated = await Design.findById(design._id)
      .populate('order', 'orderNumber priority status')
      .populate('assignedDesigner', 'firstName lastName employeeId');

    return sendSuccess(res, 'Design assignment created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create design assignment', 500, error);
  }
};

// Upload a new design version / proof
export const addDesignVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileData, fileUrl, thumbnailUrl, remarks } = req.body;

    if (!fileData && !fileUrl) {
      return sendError(res, 'Artwork file data (base64 or URL) is required', 400);
    }

    const design = await Design.findById(id);
    if (!design) {
      return sendError(res, 'Design record not found', 404);
    }

    let finalFileUrl = fileUrl;
    let finalThumbnailUrl = thumbnailUrl || '';

    // If base64 file data provided, upload securely via Cloudinary/storage
    if (fileData) {
      const uploadRes = await uploadToCloudinary(fileData, {
        folder: 'gt_erp_designs',
        resourceType: 'auto'
      });
      finalFileUrl = uploadRes.secureUrl || uploadRes.url;
    }

    const nextVersionNumber = (design.versions?.length || 0) + 1;

    const newVersion = {
      versionNumber: nextVersionNumber,
      fileUrl: finalFileUrl,
      thumbnailUrl: finalThumbnailUrl || finalFileUrl,
      status: 'pending_review',
      approvedByCustomer: false,
      uploadedAt: new Date()
    };

    design.versions.push(newVersion);
    design.status = 'proof_submitted';
    if (remarks) design.remarks = remarks.trim();

    await design.save();

    // Update order status
    await Order.findByIdAndUpdate(design.order, { status: 'design_in_progress' });

    const populated = await Design.findById(design._id)
      .populate('order', 'orderNumber customer')
      .populate('assignedDesigner', 'firstName lastName');

    return sendSuccess(res, 'New design proof version uploaded successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to upload design version', 500, error);
  }
};

// Review design version (client approval or revision request)
export const reviewDesignVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const { status, clientFeedback } = req.body; // status: 'client_approved' | 'client_rejected'

    if (!status || !['client_approved', 'client_rejected'].includes(status)) {
      return sendError(res, 'Status must be either client_approved or client_rejected', 400);
    }

    const design = await Design.findById(id);
    if (!design) {
      return sendError(res, 'Design record not found', 404);
    }

    const version = design.versions.id(versionId);
    if (!version) {
      return sendError(res, 'Design version not found', 404);
    }

    version.status = status;
    if (clientFeedback !== undefined) version.clientFeedback = clientFeedback.trim();

    if (status === 'client_approved') {
      version.approvedByCustomer = true;
      version.approvedAt = new Date();
      design.status = 'approved_for_press';

      // Update Order to design_approved (ready to dispatch to production!)
      await Order.findByIdAndUpdate(design.order, { status: 'design_approved' });
    } else {
      version.approvedByCustomer = false;
      design.status = 'revision_requested';
      await Order.findByIdAndUpdate(design.order, { status: 'design_in_progress' });
    }

    await design.save();

    const populated = await Design.findById(design._id)
      .populate('order', 'orderNumber status customer')
      .populate('assignedDesigner', 'firstName lastName');

    return sendSuccess(
      res,
      status === 'client_approved' ? 'Design proof approved for printing' : 'Revision requested',
      populated
    );
  } catch (error) {
    return sendError(res, 'Failed to review design version', 500, error);
  }
};

