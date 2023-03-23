const mongoose = require("mongoose");

const FileMetadata = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: false },
    userName: { type: String, required: true, unique: false },
    date: { type: Date, required: true, unique: false },
    fileName: { type: String, required: true, unique: false },
    size: { type: String, required: true, unique: false },
    originalFileName: { type: String, required: true, unique: false },
  },
  { collection: "file_info" }
);

const model = mongoose.model("FileMetadata", FileMetadata);
module.exports = model;
