import Service from '../models/Service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateCode } from '../utils/inventoryHelper.js';

// Create a new printing service catalog entry
export const createService = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      pricingModel,
      standardSpecifications,
      workflowTemplate,
      status
    } = req.body;

    if (!name) {
      return sendError(res, 'Service name is required', 400);
    }

    const categoryPrefix = (category || 'GEN').slice(0, 4).toUpperCase();
    const serviceCode = req.body.serviceCode?.trim().toUpperCase() || generateCode(`SRV-${categoryPrefix}`);

    const existing = await Service.findOne({ serviceCode });
    if (existing) {
      return sendError(res, 'Service code already exists', 400);
    }

    const service = await Service.create({
      serviceCode,
      name: name.trim(),
      category: category || 'offset_printing',
      description: description?.trim() || '',
      pricingModel: {
        unitOfMeasurement: pricingModel?.unitOfMeasurement || 'copy',
        basePrice: Number(pricingModel?.basePrice || 0),
        minimumOrderQuantity: Number(pricingModel?.minimumOrderQuantity || 1),
        volumeTiers: pricingModel?.volumeTiers || []
      },
      standardSpecifications: standardSpecifications || [],
      workflowTemplate: workflowTemplate || [],
      status: status || 'active'
    });

    return sendSuccess(res, 'Service created successfully', service, 201);
  } catch (error) {
    return sendError(res, 'Failed to create service', 500, error);
  }
};

// Get services with filters & search
export const getServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category,
      status = 'active',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { serviceCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [services, total] = await Promise.all([
      Service.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Service.countDocuments(query)
    ]);

    return sendSuccess(res, 'Services retrieved successfully', {
      services,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch services', 500, error);
  }
};

// Get single service by ID
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return sendError(res, 'Service not found', 404);
    }

    return sendSuccess(res, 'Service retrieved successfully', service);
  } catch (error) {
    return sendError(res, 'Failed to fetch service', 500, error);
  }
};

// Update service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      description,
      pricingModel,
      standardSpecifications,
      workflowTemplate,
      status
    } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return sendError(res, 'Service not found', 404);
    }

    if (name) service.name = name.trim();
    if (category) service.category = category;
    if (description !== undefined) service.description = description.trim();
    if (pricingModel) {
      if (pricingModel.unitOfMeasurement) service.pricingModel.unitOfMeasurement = pricingModel.unitOfMeasurement;
      if (pricingModel.basePrice !== undefined) service.pricingModel.basePrice = Number(pricingModel.basePrice);
      if (pricingModel.minimumOrderQuantity !== undefined) service.pricingModel.minimumOrderQuantity = Number(pricingModel.minimumOrderQuantity);
      if (pricingModel.volumeTiers) service.pricingModel.volumeTiers = pricingModel.volumeTiers;
    }
    if (standardSpecifications) service.standardSpecifications = standardSpecifications;
    if (workflowTemplate) service.workflowTemplate = workflowTemplate;
    if (status) service.status = status;

    await service.save();

    return sendSuccess(res, 'Service updated successfully', service);
  } catch (error) {
    return sendError(res, 'Failed to update service', 500, error);
  }
};

// Delete service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return sendError(res, 'Service not found', 404);
    }

    await Service.findByIdAndDelete(id);

    return sendSuccess(res, 'Service deleted successfully', { id });
  } catch (error) {
    return sendError(res, 'Failed to delete service', 500, error);
  }
};

