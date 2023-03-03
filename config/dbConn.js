const { connect, connection, mongo } = require("mongoose");
const Grid = require("gridfs-stream");

const dotenv = require("dotenv");
dotenv.config();

let gfs = {};
let gridfsBucket = {};
Grid.mongo = mongo;

const createDbConnection = () => {
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
};

// Export the connection instance
module.exports = {
  createDbConnection,
  getGridfsBucket: function () {
    return gridfsBucket;
  },
};
