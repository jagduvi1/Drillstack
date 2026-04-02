/**
 * Calculates how well a session's drills align with a plan phase.
 *
 * @param {Object}   plan      – Plan document (needs .objective, .phases)
 * @param {ObjectId} phaseId   – _id of the target phase inside plan.phases
 * @param {Array}    drills    – Array of Drill documents (needs .tags)
 * @returns {{ score: number, feedback: string }}
 */
function calculate(plan, phaseId, drills) {
  if (!drills || drills.length === 0) {
    return { score: 0, feedback: "No drills to evaluate" };
  }

  const phase = plan.phases.find(
    (p) => p._id.toString() === phaseId.toString()
  );
  if (!phase) {
    return { score: 0, feedback: "Phase not found in plan" };
  }

  const primary = (phase.primaryFocus || "").toLowerCase();
  const secondary = (phase.secondaryFocus || "").toLowerCase();
  const objectiveWords = (plan.objective || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const share = 100 / drills.length;
  let total = 0;

  for (const drill of drills) {
    const tags = (drill.tags || []).map((t) => t.toLowerCase());

    if (primary && tags.includes(primary)) {
      total += share * 0.5;
      // check secondary too for bonus
      if (secondary && tags.includes(secondary)) {
        total += share * 0.3;
      }
      // check objective for extra bonus
      if (objectiveWords.length && tags.some((t) => objectiveWords.includes(t))) {
        total += share * 0.2;
      }
    } else if (secondary && tags.includes(secondary)) {
      total += share * 0.3;
      if (objectiveWords.length && tags.some((t) => objectiveWords.includes(t))) {
        total += share * 0.2;
      }
    } else if (objectiveWords.length && tags.some((t) => objectiveWords.includes(t))) {
      total += share * 0.2;
    } else {
      total -= share * 0.1;
    }
  }

  const score = Math.round(Math.min(100, Math.max(0, total)));

  let feedback;
  if (score >= 80) feedback = "Excellent alignment";
  else if (score >= 60) feedback = "Good alignment";
  else if (score >= 40) feedback = "Moderate alignment";
  else feedback = "Weak alignment";

  return { score, feedback };
}

module.exports = { calculate };
