const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const generateJwtToken = (user) => {
  const token = jwt.sign(
    {
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: 86400, // 1 year in seconds
    }
  );
  return token;
};

module.exports = { generateJwtToken };
