const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const Grid = require("gridfs-stream");
const Busboy = require("busboy");
const fs = require("fs");
const { Readable } = require("stream");
const { connect, connection, mongo } = require("mongoose");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

var gfs = {},
  gridfsBucket = {};
Grid.mongo = mongo;

//Prepare the encryption and decryption
const algorithm = "aes-256-cbc"; // Choose an encryption algorithm
const key = crypto.randomBytes(32); // Generate a random encryption key
const iv = crypto.randomBytes(16); // Generate a random initialization vector

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
const encryptFile = (req, res) => {
  const inputStream = convertToStream(req);
  const encryptedStream = encryptSt(inputStream);
  encryptedStream.pipe(fs.createWriteStream("enc.pdf"));

  var writeStream = gridfsBucket.openUploadStream("myfile.pdf");

  encryptedStream.pipe(writeStream);
  writeStream.on("close", function () {
    console.log("done");
    decryptSt(gridfsBucket.openDownloadStreamByName("myfile.pdf"), key).pipe(
      fs.createWriteStream("dec.pdf")
    );

    console.log("Decrypted");
  });

  writeStream.on("error", (err) => {
    console.log(err);
  });
};

// Handle file upload
app.post("/upload", encryptFile, (req, res) => {});

app.listen(PORT, () => {
  //Connect to MongoDB using Mongoose
  connect(process.env.MONGO_CONNECT_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log("Connection established to mongodb");
      gridfsBucket = new mongo.GridFSBucket(connection.db, {
        bucketName: "files",
      });

      gfs = Grid(connection.db, mongo);
      gfs.collection("files");
    })
    .catch((err) => console.error(err));
  console.log(`Server running on port ${PORT}`);
});

// connection.on("open", function (err) {
//   if (err) throw err;
//   // Set up connection
//   gridfsBucket = new mongo.GridFSBucket(connection.db, {
//     bucketName: "files",
//   });

//   gfs = Grid(connection.db, mongo);
//   gfs.collection("files");
//   console.log("listening and connected");
// });
