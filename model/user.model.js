const mongoose = require("mongoose");

const User = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, required: true },
    key: { type: String, required: true },
  },
  { collection: "user_profile" }
);

const model = mongoose.model("UserProfile", User);
module.exports = model;
