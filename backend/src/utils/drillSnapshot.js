function createDrillSnapshot(drill) {
  return {
    title: drill.title,
    description: drill.description,
    sport: drill.sport,
    intensity: drill.intensity,
    setup: drill.setup ? drill.setup.toObject() : {},
    howItWorks: drill.howItWorks,
    coachingPoints: [...drill.coachingPoints],
    variations: [...drill.variations],
    commonMistakes: [...drill.commonMistakes],
    diagrams: [...drill.diagrams],
  };
}

module.exports = { createDrillSnapshot };
