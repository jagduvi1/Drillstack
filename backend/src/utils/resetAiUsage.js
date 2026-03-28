function resetAiUsageIfNeeded(user) {
  const now = new Date();
  const resetAt = new Date(user.aiRequestsResetAt || 0);
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    user.aiRequestsUsed = 0;
    user.aiRequestsResetAt = now;
    return true;
  }
  return false;
}

module.exports = { resetAiUsageIfNeeded };
