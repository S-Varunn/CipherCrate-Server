const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const { createDbConnection } = require("./config/dbConn");
const verifyToken = require("./helpers/auth");
const { generateJwtToken } = require("./helpers/helpers");
const {
  uploadFile,
  downloadFile,
} = require("./encrypt_decrypt/encrypt_decrypt");
const { mask, deMask, sha256 } = require("./helpers/crypto");
const User = require("./model/user.model");
const FileMetadata = require("./model/file.model");

const crypto = require("crypto");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// Handle file upload
app.post("/v1/upload", verifyToken, uploadFile, (req, res) => {
  console.log("Done uploading");
  res.json({ status: "success", message: "Successfully uploaded" });
});

app.post("/v1/download", verifyToken, downloadFile, (req, res) => {});

app.get("/v1/filelist/:email", verifyToken, async (req, res) => {
  const user = await User.findOne({
    email: deMask(req.body.email),
  });

  if (user) {
    let passphrase = deMask(req.body.passphrase);

    if (user.passphrase === sha256(passphrase)) {
      console.log("Yes");
    } else console.log("No");
  }
  const filter = {
    email: deMask(req.params.email),
  };
  let fileList = [];
  const all = await FileMetadata.find(filter);
  all.forEach((file) => {
    let currFile = {};
    currFile.filename = file.fileName;
    currFile.size = file.size;
    currFile.createdAt = file.date;
    fileList.push(currFile);
  });
  res.json({ status: "success", fileList });
});

app.post("/v1/checkPassphrase", verifyToken, async (req, res) => {
  const user = await User.findOne({
    email: deMask(req.body.email),
  });
  let oneWayPassphrase = sha256(deMask(req.body.passphrase));

  if (oneWayPassphrase === user.passphrase)
    res.json({ status: "ok", message: "Correct Passphrase" });
  else res.json({ status: "error", message: "Incorrect Passphrase" });
});

app.post("/v1/signup", async (req, res) => {
  const user = await User.findOne({
    email: deMask(req.body.email),
  });
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
  let password = deMask(req.body.password),
    passphrase = deMask(req.body.passphrase),
    userName = deMask(req.body.userName),
    email = deMask(req.body.email);
  let oneWayPassphrase = sha256(passphrase);

  bcrypt.genSalt(10, async (err, salt) => {
    bcrypt.hash(password, salt, async function (err, hash) {
      try {
        await User.create({
          userName: userName,
          email: email,
          password: hash,
          date: new Date(),
          passphrase: oneWayPassphrase,
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
