const crypto = require("crypto");
const Busboy = require("busboy");
const { Readable } = require("stream");
const { getGridfsBucket } = require("../config/dbConn");
const FileMetadata = require("../model/file.model");
const { mask } = require("../helpers/mask");
const { fileSizeFormatter } = require("../helpers/helpers");

const algorithm = "aes-256-cbc";
const key = process.env.MASK_KEY;
const iv = process.env.MASK_IV;

const cipher = crypto.createCipheriv(algorithm, key, iv);
const decipher = crypto.createDecipheriv(algorithm, key, iv);

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

    bb.on("field", (fieldname, val, fieldnameTruncated, valTruncated) => {
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
        console.log(file);
        metadata.size = fileSizeFormatter(size, 2);
        resolve({ stream, metadata });
      });
    });

    req.pipe(bb);
  });
}

// Encryption
function encryptSt(stream) {
  return stream.pipe(cipher);
}

//Decryption
function decryptSt(stream) {
  return stream.pipe(decipher);
}

//Function to encrypt the file and stream it to mongodb
const encryptFile = async (req, res, next) => {
  let gridfsBucket = getGridfsBucket();
  if (gridfsBucket === {})
    res.json({ status: "error", message: "Try again in some time" });

  const { stream, metadata } = await convertToStream(req);
  const fileName = mask(metadata.name);

  const encryptedStream = encryptSt(stream);

  var writeStream = gridfsBucket.openUploadStream(fileName);

  encryptedStream.pipe(writeStream);
  writeStream.on("close", async function () {
    console.log("Done uploading file");
    try {
      await FileMetadata.create({
        email: metadata.user.email,
        userName: metadata.user.userName,
        date: new Date(),
        size: metadata.size,
        fileName,
      });
      next();
    } catch (err) {
      console.log(err);
      res.json({ status: "error", error: "Unable to upload file" });
    }
  });

  writeStream.on("error", (err) => {
    console.log(err);
  });
};

const decryptFile = (req, res, next) => {
  let gridfsBucket = getGridfsBucket();

  decryptSt(gridfsBucket.openDownloadStreamByName("myfile.pdf"), key);
};

module.exports = { encryptFile };
