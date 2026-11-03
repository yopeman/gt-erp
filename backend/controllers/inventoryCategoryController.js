import InventoryCategory from '../models/InventoryCategory.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Create category
export const createCategory = async (req, res) => {
  try {
    const { name, description, parentCategory, categoryType, status } = req.body;

    if (!name || !categoryType) {
      return sendError(res, 'Category name and categoryType are required', 400);
    }

    const category = await InventoryCategory.create({
      name,
      description,
      parentCategory: parentCategory || null,
      categoryType,
      status: status || 'active'
    });

    const populated = await category.populate('parentCategory', 'name categoryType');

    return sendSuccess(res, 'Category created successfully', populated, 201);
  } catch (error) {
    return sendError(res, 'Failed to create category', 500, error);
  }
};

// Get categories
export const getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, categoryType, parentCategory, status, includeDeleted = 'false' } = req.query;

    const query = {};
    if (includeDeleted !== 'true') query.isDeleted = false;
    if (status) query.status = status;
    if (categoryType) query.categoryType = categoryType;
    if (parentCategory) query.parentCategory = parentCategory;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await InventoryCategory.countDocuments(query);
    const categories = await InventoryCategory.find(query)
      .populate('parentCategory', 'name categoryType')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, 'Categories fetched successfully', categories, 200, {
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch categories', 500, error);
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const category = await InventoryCategory.findById(req.params.id).populate('parentCategory', 'name categoryType');
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    return sendSuccess(res, 'Category retrieved successfully', category);
  } catch (error) {
    return sendError(res, 'Failed to retrieve category', 500, error);
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const category = await InventoryCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('parentCategory', 'name categoryType');

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    return sendSuccess(res, 'Category updated successfully', category);
  } catch (error) {
    return sendError(res, 'Failed to update category', 500, error);
  }
};

// Soft delete category
export const deleteCategory = async (req, res) => {
  try {
    const category = await InventoryCategory.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, status: 'inactive' },
      { new: true }
    );
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    return sendSuccess(res, 'Category deactivated successfully', category);
  } catch (error) {
    return sendError(res, 'Failed to delete category', 500, error);
  }
};

