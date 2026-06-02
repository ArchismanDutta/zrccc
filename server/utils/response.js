// utils/response.js
// Standardizes all API responses.
// Shape: { success, data } | { success, error: { code, message } }

const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const created = (res, data) => success(res, data, 201);

const paginated = (res, { docs, total, page, limit }) => {
  return res.status(200).json({
    success: true,
    data: docs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};

const error = (res, err, statusCode) => {
  const code = err.code || "SERVER_ERROR";
  const message = err.message || "An unexpected error occurred";
  const status = statusCode || err.statusCode || 500;
  return res.status(status).json({ success: false, error: { code, message } });
};

module.exports = { success, created, paginated, error };
