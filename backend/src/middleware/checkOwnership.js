/**
 * Reusable authorization middleware factory.
 * Checks if the current user is the resource owner or has group-level access.
 */

/**
 * Creates middleware that loads a resource and checks ownership/group access.
 * @param {Model} Model - Mongoose model to query
 * @param {object} opts
 * @param {string} [opts.resourceName] - Name for error messages (default: "Resource")
 * @param {boolean} [opts.allowAdmin] - Also allow req.user.role === "admin" (default: false)
 * @param {boolean} [opts.allowGroupTrainer] - Allow group trainers via req.userTrainerGroupIds (default: true)
 * @param {string} [opts.groupField] - Field name for group access check: "group" (single ref) or "followers" (array of refs). Default: "group"
 */
function checkOwnership(Model, opts = {}) {
  const {
    resourceName = "Resource",
    allowAdmin = false,
    allowGroupTrainer = true,
    groupField = "group",
  } = opts;

  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: `${resourceName} not found` });
      }

      const isOwner = resource.createdBy.toString() === req.user._id.toString();
      const isAdmin = allowAdmin && req.user.role === "admin";

      let isGroupMember = false;
      if (allowGroupTrainer && req.userTrainerGroupIds?.length) {
        const fieldValue = resource[groupField];
        if (Array.isArray(fieldValue)) {
          // followers-style: array of group refs
          isGroupMember = fieldValue.some((fid) =>
            req.userTrainerGroupIds.some((gid) => gid.toString() === fid.toString())
          );
        } else if (fieldValue) {
          // group-style: single group ref
          isGroupMember = req.userTrainerGroupIds.some(
            (gid) => gid.toString() === fieldValue.toString()
          );
        }
      }

      if (!isOwner && !isAdmin && !isGroupMember) {
        return res.status(403).json({ error: "Not authorized" });
      }

      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { checkOwnership };
