const Drill = require("../models/Drill");
const TacticBoard = require("../models/TacticBoard");
const Notification = require("../models/Notification");
const { removeDrill } = require("../services/sync");

const RETENTION_DAYS = 30;

async function runCleanup() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const drills = await Drill.find({
      pendingDeletion: true,
      deletionRequestedAt: { $lt: cutoff },
    });

    for (const drill of drills) {
      await TacticBoard.deleteMany({ drill: drill._id });
      await Notification.deleteMany({ drillId: drill._id });
      removeDrill(drill._id).catch(() => {});
      await drill.deleteOne();
      console.log(`Cleanup: deleted unclaimed drill "${drill.title}" (${drill._id})`);
    }

    if (drills.length > 0) {
      console.log(`Cleanup: removed ${drills.length} unclaimed drill(s)`);
    }
  } catch (err) {
    console.error("Cleanup job error:", err.message);
  }
}

module.exports = { runCleanup };
