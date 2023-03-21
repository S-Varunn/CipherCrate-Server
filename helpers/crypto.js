const crypto = require("crypto");
const { unStitch } = require("./helpers");

const algorithm = "aes-256-cbc"; // Choose an encryption algorithm
const maskKey = process.env.MASTER_KEY;

function customMasking(message, secret) {
  const cipher = crypto.createCipheriv(algorithm, secret, maskIV);
  let ciphertext = cipher.update(message, "utf-8", "base64");
  ciphertext += cipher.final("base64");
  return ciphertext;
}
function customDeMasking(message, secret) {
  const decipher = crypto.createDecipheriv(algorithm, secret, maskIV);
  let deciphertext = decipher.update(message, "utf-8", "base64");
  deciphertext += decipher.final("base64");
  return deciphertext;
}

function mask(message) {
  const cipher = crypto.createCipheriv(algorithm, maskKey, maskIV);
  let ciphertext = cipher.update(message, "utf-8", "base64");
  ciphertext += cipher.final("base64");
  return ciphertext;
}
function deMask(encMessage) {
  let { iv, message } = unStitch(encMessage);
  // console.log("Iv: ", iv, " Message: ", message);
  const decipher = crypto.createDecipheriv(algorithm, maskKey, iv);
  let plaintext = decipher.update(message, "base64", "utf-8");
  plaintext += decipher.final("utf-8");
  return plaintext;
}

function sha256(str) {
  const hash = crypto.createHash("sha256");
  hash.update(str);
  return hash.digest("hex");
}

module.exports = { mask, deMask, customMasking, customDeMasking, sha256 };
