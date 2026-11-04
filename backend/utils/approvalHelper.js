import ApprovalHistory from '../models/ApprovalHistory.js';
import Employee from '../models/Employee.js';

/**
 * Record an action in ApprovalHistory with automatic user/employee resolution
 */
export const recordApprovalEvent = async ({
  referenceType,
  referenceId,
  action,
  user,
  comment = ''
}) => {
  try {
    if (!referenceType || !referenceId || !action || !user) {
      return null;
    }

    let actionBy = user._id || user;
    let actionByModel = 'User';

    // If possible, check if user has corresponding employee profile
    if (user.email) {
      const employee = await Employee.findOne({ email: user.email.toLowerCase() });
      if (employee) {
        actionBy = employee._id;
        actionByModel = 'Employee';
      }
    }

    const history = await ApprovalHistory.create({
      referenceType,
      referenceId,
      action,
      actionBy,
      actionByModel,
      comment: comment ? String(comment).trim() : '',
      actionDate: new Date()
    });

    return history;
  } catch (error) {
    console.error(`[ApprovalHistory] Failed to log ${action} on ${referenceType}:`, error.message);
    return null;
  }
};

export default {
  recordApprovalEvent
};

