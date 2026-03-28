const Group = require("../models/Group");

/**
 * Attaches group membership info to req for use in session/plan queries.
 * Sets:
 *  req.userGroupIds      — IDs of groups the user belongs to
 *  req.userTrainerGroupIds — IDs where user is admin or trainer
 *  req.userClubGroupIds  — IDs of ALL groups under clubs the user belongs to (for club-level visibility)
 */
async function resolveUserGroups(req, res, next) {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ "members.user": userId }).lean();

    req.userGroupIds = groups.map((g) => g._id);

    req.userTrainerGroupIds = groups
      .filter((g) => {
        const m = g.members.find((m) => m.user.toString() === userId.toString());
        return m && (m.role === "admin" || m.role === "trainer");
      })
      .map((g) => g._id);

    // Find all clubs the user is a member of
    const clubIds = groups.filter((g) => g.type === "club").map((g) => g._id);
    // Also include parent clubs of teams the user belongs to
    const parentClubIds = groups.filter((g) => g.parentClub).map((g) => g.parentClub);
    const allClubIds = [...new Set([...clubIds, ...parentClubIds].map((id) => id.toString()))];

    if (allClubIds.length > 0) {
      // Find all groups (teams) under those clubs
      const clubChildren = await Group.find({ parentClub: { $in: allClubIds } }).select("_id").lean();
      req.userClubGroupIds = [
        ...allClubIds,
        ...clubChildren.map((g) => g._id.toString()),
      ].map((id) => (typeof id === "string" ? id : id.toString()));
    } else {
      req.userClubGroupIds = [];
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveUserGroups };
