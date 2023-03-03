const crypto = require("crypto");

const algorithm = "aes-256-cbc"; // Choose an encryption algorithm
const maskKey = process.env.MASK_KEY; // Generate a random encryption key
const maskIV = process.env.MASK_IV;

//Example of verify token

// app.post("/v1/passphrase", verifyToken, (req, res) => {
//   const passphrase = deMask(req.body.passphrase);

//   res.json({ status: "ok" });
// });

// function generateKey(passphrase) {
//   const algorithm = "aes-256-ctr";
//   const password = passphrase;
//   const key = crypto.randomBytes(32); // Generate a random encryption key
//   var cipher = crypto.createCipher(algorithm, password);
//   var crypted = Buffer.concat([cipher.update(key), cipher.final()]);
//   console.log(crypted.toString("hex"));
//   return crypted.toString("hex");
// }

function mask(message) {
  const cipher = crypto.createCipheriv(algorithm, maskKey, maskIV);
  let ciphertext = cipher.update(message, "utf-8", "base64");
  ciphertext += cipher.final("base64");
  return ciphertext;
}
function deMask(message) {
  const decipher = crypto.createDecipheriv(algorithm, maskKey, maskIV);
  let plaintext = decipher.update(message, "base64", "utf-8");
  plaintext += decipher.final("utf-8");
  return plaintext;
}

module.exports = { mask, deMask };
