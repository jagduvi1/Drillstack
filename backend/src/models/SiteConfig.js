const mongoose = require("mongoose");

const siteConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Helper to get a config value with a default
siteConfigSchema.statics.getValue = async function (key, defaultValue = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// Helper to set a config value
siteConfigSchema.statics.setValue = async function (key, value, userId, description) {
  return this.findOneAndUpdate(
    { key },
    { value, updatedBy: userId, ...(description ? { description } : {}) },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model("SiteConfig", siteConfigSchema);
