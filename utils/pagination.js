export const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

export const buildSort = (sortParam, allowedFields = [], defaultSort = { createdAt: -1 }) => {
  if (!sortParam) return defaultSort;
  const sort = {};
  String(sortParam)
    .split(',')
    .forEach((field) => {
      const dir = field.startsWith('-') ? -1 : 1;
      const key = field.replace(/^-/, '');
      if (allowedFields.length === 0 || allowedFields.includes(key)) {
        sort[key] = dir;
      }
    });
  return Object.keys(sort).length ? sort : defaultSort;
};
