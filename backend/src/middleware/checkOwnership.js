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
 */
function checkOwnership(Model, opts = {}) {
  const {
    resourceName = "Resource",
    allowAdmin = false,
    allowGroupTrainer = true,
  } = opts;

  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: `${resourceName} not found` });
      }

      const isOwner = resource.createdBy.toString() === req.user._id.toString();
      const isAdmin = allowAdmin && req.user.role === "admin";
      const isGroupMember = allowGroupTrainer && resource.group &&
        req.userTrainerGroupIds &&
        req.userTrainerGroupIds.some((gid) => gid.toString() === resource.group.toString());

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
