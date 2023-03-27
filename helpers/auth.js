const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const verifyToken = (req, res, next) => {
  const token =
    req.body.token || req.query.token || req.headers["x-access-token"];
  // console.log("Jwt Token: ", token);
  if (!token) {
    return res
      .status(403)
      .send({ message: "A token is required for authentication" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // console.log("Decoded Token: ", decoded);
  } catch (err) {
    res.status(401).json({
      message: "Not authorized!",
    });
  }
  return next();
};

module.exports = verifyToken;
