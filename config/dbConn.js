const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();
const uri = process.env.MONGO_CONNECT_URI;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const conn = mongoose.createConnection(uri, options);
conn.on("connection", () => {
  console.log("Connection established to MongoDB");
});

// Export the connection instance
module.exports = conn;
