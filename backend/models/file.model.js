const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const mediaSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    file_key: {
      type: String,
      required: true,
      trim: true,
    },
    file_mimetype: {
      type: String,
      required: true,
      trim: true,
    },
    file_location: {
      type: String,
      required: true,
      trim: true,
    },
    file_name: {
      type: String,
      required: true,
      trim: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    file_type: {
      type: String,
      enum: ["Image", "Video", "Other"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

mediaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 * 24 * 15 });

const Media = mongoose.model("Media", mediaSchema);

module.exports = Media;