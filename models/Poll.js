const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  votes: { type: Number, default: 0 }
});

const pollSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  options: [optionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Poll", pollSchema);
