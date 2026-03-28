/**
 * Pagination utility — parses page/limit from query params.
 */
function parsePagination(query, defaults = {}) {
  const { maxLimit = 100, defaultLimit = 20 } = defaults;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, parseInt(query.limit, 10) || defaultLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = { parsePagination };
