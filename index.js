const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { createDbConnection, getGridfsBucket } = require("./config/dbConn");
const verifyToken = require("./helpers/auth");
const { generateJwtToken } = require("./helpers/helpers");
const { encryptFile } = require("./encrypt_decrypt/encrypt_decrypt");
const { mask, deMask } = require("./helpers/mask");
const User = require("./model/user.model");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Handle file upload
app.post("/v1/upload", encryptFile, (req, res) => {
  console.log("Done uploading");
});

app.post("/v1/signup", async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  });
  console.log(user);
  if (user) {
    bcrypt.compare(
      deMask(req.body.password),
      user.password,
      function (err, result) {
        if (result) {
          const token = generateJwtToken(user);
          res.json({ status: "ok", token, userName: user.userName });
        } else {
          res.json({ status: "error", error: "Password mismatch" });
        }
      }
    );
  } else
    res.json({
      status: "error",
      error: "No user found with the provided email",
    });
});

app.post("/v1/register", async (req, res) => {
  const password = deMask(req.body.password);
  bcrypt.genSalt(10, async (err, salt) => {
    bcrypt.hash(password, salt, async function (err, hash) {
      try {
        await User.create({
          userName: req.body.userName,
          email: req.body.email,
          password: hash,
          date: new Date(),
          passphrase: req.body.passphrase,
        });
        const token = generateJwtToken({ email: req.body.email });
        res.json({ status: "ok", token });
      } catch (err) {
        console.log(err);
        res.json({ status: "error", error: "Duplicate email" });
      }
    });
  });
});

app.listen(PORT, () => {
  //Connect to MongoDB using Mongoose
  createDbConnection();
  console.log(`Server running on port ${PORT}`);
});
