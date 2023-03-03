const crypto = require("crypto");
const Busboy = require("busboy");
const { Readable } = require("stream");
const { getGridfsBucket } = require("../config/dbConn");

const algorithm = "aes-256-cbc";
const key = process.env.MASK_KEY;
const iv = process.env.MASK_IV;

const cipher = crypto.createCipheriv(algorithm, key, iv);
const decipher = crypto.createDecipheriv(algorithm, key, iv);

// Function to convert the request buffer to stream
function convertToStream(req) {
  const stream = new Readable({
    objectMode: true,
    read() {},
  });
  const bb = Busboy({ headers: req.headers });
  bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
    file.on("data", (data) => {
      stream.push(data);
    });
    file.on("end", () => {
      stream.push(null);
    });
  });

  req.pipe(bb);

  return stream;
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
const encryptFile = (req, res, next) => {
  //   console.log(req.headers);
  let gridfsBucket = getGridfsBucket();
  const inputStream = convertToStream(req);
  const encryptedStream = encryptSt(inputStream);

  var writeStream = gridfsBucket.openUploadStream("myfile.pdf");

  encryptedStream.pipe(writeStream);
  writeStream.on("close", function () {
    console.log("done");
    // decryptSt(gridfsBucket.openDownloadStreamByName("myfile.pdf"), key).pipe(
    //   fs.createWriteStream("dec.pdf")
    // );
    next();
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
