import ApprovalHistory from '../models/ApprovalHistory.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Get approval history for a reference
export const getApprovalHistory = async (req, res) => {
  try {
    const { referenceType, referenceId } = req.query;
    const query = {};
    if (referenceType) query.referenceType = referenceType;
    if (referenceId) query.referenceId = referenceId;

    const history = await ApprovalHistory.find(query)
      .populate('actionBy', 'fullName email department position')
      .sort({ actionDate: -1 });

    return sendSuccess(res, 'Approval history retrieved successfully', history);
  } catch (error) {
    return sendError(res, 'Failed to fetch approval history', 500, error);
  }
};

