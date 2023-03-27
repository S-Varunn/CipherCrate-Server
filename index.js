const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const { createDbConnection } = require("./config/dbConn");
const verifyToken = require("./helpers/auth");
const { generateJwtToken, unStitch } = require("./helpers/helpers");
const {
  uploadFile,
  downloadFile,
} = require("./encrypt_decrypt/encrypt_decrypt");
const {
  deMask,
  sha256,
  createPassphraseDecipher,
} = require("./helpers/crypto");
const User = require("./model/user.model");
const FileMetadata = require("./model/file.model");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// Handle file upload
app.post("/v1/upload", verifyToken, uploadFile, (req, res) => {
  console.log("Done uploading");
  res.status(200).json({
    message: "Upload Successful!",
  });
});

app.post("/v1/download", verifyToken, downloadFile);
app.get("/v1/download", downloadFile);

app.post("/v1/filelist", verifyToken, async (req, res) => {
  const email = deMask(req.body.email);
  const filter = {
    email,
  };
  let fileList = [];
  const all = await FileMetadata.find(filter);
  all.forEach((file) => {
    let currFile = {};
    let stitchedEncryptedFileName = file.fileName;
    let fileName = createPassphraseDecipher(
      deMask(req.body.passphrase),
      true,
      stitchedEncryptedFileName
    );
    //obtaining the file type
    const fileSplits = fileName.split(".");
    const fileType = fileSplits[fileSplits.length - 1];
    //Constucting the file to send to the client
    currFile.encryptedFileName = stitchedEncryptedFileName;
    currFile.filename = fileName;
    currFile.size = file.size;
    currFile.date = file.date;
    currFile.type = fileType;
    fileList.push(currFile);
  });
  res.status(200).json({
    fileList,
    message: "Successfully retrieved user information!",
  });
});

//Completely set up
// Handle rejection messages
app.post("/v1/checkPassphrase", verifyToken, async (req, res) => {
  const user = await User.findOne({
    email: deMask(req.body.email),
  });
  let oneWayPassphrase = sha256(deMask(req.body.passphrase));

  if (oneWayPassphrase === user.passphrase)
    res.status(200).json({
      message: "Passphrase is correct! Kampai!",
    });
  else
    res.status(401).json({
      message: "Passphrase Incorrect! Please try again!",
    });
});

//Completely set up
app.post("/v1/signup", async (req, res) => {
  const user = await User.findOne({
    email: deMask(req.body.email),
  });
  let userName = user.userName;
  if (user) {
    bcrypt.compare(
      deMask(req.body.password),
      user.password,
      function (err, result) {
        if (result) {
          const token = generateJwtToken(user);
          res.status(200).json({
            token,
            userName,
            message: "Successfully signed in!",
          });
        } else {
          res.status(401).json({
            message: "Password Incorrect! Please try again!",
          });
        }
      }
    );
  } else
    res.status(401).json({
      message: "No user with the email provided !",
    });
});

//Completely set up
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
        res.status(200).json({
          token,
          message: "Successfully Registered!",
        });
      } catch (err) {
        console.log(err);
        res.status(401).json({
          message: "An user with the email already exists!",
        });
      }
    });
  });
});

app.listen(PORT, () => {
  //Connect to MongoDB using Mongoose
  createDbConnection();
  console.log(`Server running on port ${PORT}`);
});
