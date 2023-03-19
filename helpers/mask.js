const crypto = require("crypto");

const algorithm = "aes-256-cbc"; // Choose an encryption algorithm
const maskKey = process.env.MASK_KEY; // Generate a random encryption key
const maskIV = process.env.MASK_IV;

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
function deMask(message) {
  let iv = message.substring(1, 17);
  console.log(iv);
  message = message.substring(0, 1) + message.substring(17);
  const decipher = crypto.createDecipheriv(algorithm, maskKey, iv);
  let plaintext = decipher.update(message, "base64", "utf-8");
  plaintext += decipher.final("utf-8");
  return plaintext;
}

module.exports = { mask, deMask, customMasking, customDeMasking };
