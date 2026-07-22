export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

export const sendError = (res, { statusCode = 500, message = 'Something went wrong', details = null }) => {
  const body = { success: false, message };
  if (details !== null) body.details = details;
  return res.status(statusCode).json(body);
};
