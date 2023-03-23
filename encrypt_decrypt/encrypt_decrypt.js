const crypto = require("crypto");
const Busboy = require("busboy");
const { Readable } = require("stream");
const { getGridfsBucket } = require("../config/dbConn");
const FileMetadata = require("../model/file.model");
const fs = require("fs");
const {
  deMask,
  createPassphraseCipher,
  createPassphraseDecipher,
} = require("../helpers/crypto");
const { fileSizeFormatter, stitch, unStitch } = require("../helpers/helpers");
const verifyToken = require("../helpers/auth");

//Change key to user passphrase (Dont store passphrase in db)
//Conceal iv in some param and store in db
const algorithm = "aes-256-cbc";

// Function to convert the request buffer to stream
function convertToStream(req) {
  return new Promise((resolve, reject) => {
    const stream = new Readable({
      objectMode: true,
      read() {},
    });

    const bb = Busboy({ headers: req.headers });
    let metadata = {};
    let size = 0;

    bb.on("field", (fieldname, val) => {
      if (fieldname === "metadata") {
        metadata = JSON.parse(val);
      }
    });

    bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
      file.on("data", (data) => {
        stream.push(data);
        size += data.length;
      });
      file.on("end", () => {
        stream.push(null);
        metadata.size = fileSizeFormatter(size, 2);
        resolve({ stream, metadata });
      });
    });
    req.pipe(bb);
  });
}

//Decryption
function decryptSt(stream) {
  return stream.pipe(decipher);
}

//Function to encrypt the file and stream it to mongodb
const uploadFile = async (req, res, next) => {
  // Initialising grid fs bucket (Takes some time to set up)
  let gridfsBucket = getGridfsBucket();

  if (gridfsBucket === {})
    res.status(425).json({
      message: "Try again in some time!",
    });

  const { stream, metadata } = await convertToStream(req);

  const name = deMask(metadata.name);
  const passphrase = deMask(metadata.passphrase);

  try {
    let dbFile = await FileMetadata.findOne({
      originalFileName: name,
      email: deMask(metadata.user.email),
    });
    if (dbFile) {
      res.status(401).json({
        message: "File already exists",
      });
      return;
    }
  } catch (err) {
    console.log("err");
  }

  const iv = crypto.randomBytes(10).toString("base64");

  let encFileName = createPassphraseCipher(passphrase, iv, true, name);

  const fileName = stitch(encFileName, iv);

  let cipher = createPassphraseCipher(passphrase, iv, false, "");

  const encryptedStream = stream.pipe(cipher);
  let writeStream = gridfsBucket.openUploadStream(fileName);

  encryptedStream.pipe(writeStream);

  writeStream.on("close", async function () {
    try {
      await FileMetadata.create({
        email: deMask(metadata.user.email),
        userName: metadata.user.userName,
        fileName,
        date: new Date(),
        size: metadata.size,
        originalFileName: name,
      });
      next();
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: "Unable to upload file! Please try again!",
      });
    }
  });

  writeStream.on("error", (err) => {
    console.log(err);
  });
};

const downloadFile = (req, res, next) => {
  console.log(req.query);
  console.log(decodeURIComponent(req.query.passphrase));
  const fileName = decodeURIComponent(req.query.fileName);
  const passphrase = decodeURIComponent(req.query.passphrase);
  // const email = decodeURIComponent(req.query.email);

  let key = deMask(passphrase);
  let { iv } = unStitch(fileName);

  let gridfsBucket = getGridfsBucket();
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  res.setHeader("Content-Type", "blob");
  gridfsBucket
    .openDownloadStreamByName(fileName)
    .pipe(decipher)
    // .pipe(fs.createWriteStream("file.jpg"));
    .pipe(res);
};

module.exports = { uploadFile, downloadFile };
