const crypto = require("crypto");
const Busboy = require("busboy");
const { Readable } = require("stream");
const { getGridfsBucket } = require("../config/dbConn");
const FileMetadata = require("../model/file.model");
const { mask } = require("../helpers/crypto");
const { fileSizeFormatter, stitch } = require("../helpers/helpers");
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
  let gridfsBucket = getGridfsBucket();

  if (gridfsBucket === {})
    res.json({ status: "error", message: "Try again in some time" });

  const { stream, metadata } = await convertToStream(req);

  const iv = crypto.getRandomValues(16);
  const cipher = crypto.createCipheriv(algorithm, metadata.passphrase, iv);

  const encFileName = mask(metadata.name);
  const fileName = stitch(encFileName, iv);
  const encryptedStream = stream.pipe(cipher);
  let writeStream = gridfsBucket.openUploadStream(fileName);

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

const downloadFile = (req, res, next) => {
  //Situate the download tomorrow
  let key = req.body.passphrase;
  let gridfsBucket = getGridfsBucket();
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  decryptSt(gridfsBucket.openDownloadStreamByName("myfile.pdf"), key);
};

module.exports = { uploadFile, downloadFile };
