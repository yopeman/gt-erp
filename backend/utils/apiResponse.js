/**
 * Send standard success JSON response
 */
export const sendSuccess = (res, message = 'Success', data = null, statusCode = 200, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra
  });
};

/**
 * Send standard error JSON response
 */
export const sendError = (res, message = 'An error occurred', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message
  };

  if (error) {
    response.error = typeof error === 'string' ? error : error.message || error;
  }

  return res.status(statusCode).json(response);
};

export default {
  sendSuccess,
  sendError
};

