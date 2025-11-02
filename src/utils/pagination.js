const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MIN_PAGE = 1;
const MAX_PAGE = 10000; 
const getPaginationParams = (req) => {
  let page = parseInt(req.query.page);
  if (isNaN(page) || page < MIN_PAGE) {
    page = DEFAULT_PAGE;
  } else if (page > MAX_PAGE) {
    page = MAX_PAGE;
  }

  let limit = parseInt(req.query.limit);
  if (isNaN(limit) || limit < MIN_LIMIT) {
    limit = DEFAULT_LIMIT;
  } else if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
  };
};

module.exports = {
  getPaginationParams,
  getPaginationMeta,
};

