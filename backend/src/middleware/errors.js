/**
 * Standardized error response helpers.
 * Provides consistent error format: { error: "ERROR_CODE", message: "Human-readable message" }
 */

const ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
};

function notFound(res, resourceName = "Resource") {
  return res.status(404).json({
    error: ERROR_CODES.NOT_FOUND,
    message: `${resourceName} not found`,
  });
}

function notAuthorized(res, message = "Not authorized") {
  return res.status(403).json({
    error: ERROR_CODES.NOT_AUTHORIZED,
    message,
  });
}

function badRequest(res, message) {
  return res.status(400).json({
    error: ERROR_CODES.VALIDATION_ERROR,
    message,
  });
}

module.exports = { ERROR_CODES, notFound, notAuthorized, badRequest };
