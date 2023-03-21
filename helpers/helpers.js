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
const fileSizeFormatter = (bytes, decimal) => {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const dm = decimal || 2;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "YB", "ZB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1000));
  return (
    parseFloat((bytes / Math.pow(1000, index)).toFixed(dm)) + " " + sizes[index]
  );
};

const scramble = (string1, string2, isShuffle, length1) => {
  let shuffle = (inArr, seed, unshuffle = false) => {
      let outArr = Array.from(inArr),
        len = inArr.length;

      let swap = (a, b) => ([outArr[a], outArr[b]] = [outArr[b], outArr[a]]);

      for (
        var i = unshuffle ? len - 1 : 0;
        (unshuffle && i >= 0) || (!unshuffle && i < len);
        i += unshuffle ? -1 : 1
      )
        swap(seed[i % seed.length] % len, i);

      return outArr;
    },
    unshuffle = (inArr, seed) => shuffle(inArr, seed, true);

  let array = Array.from(string1 + string2);
  let seed = [3, 45, 6, 34, 2, 78, 6, 1];

  for (var i = 0; i < array.length / 2; i++) seed.push(9);

  let shuffled = shuffle(array, seed);
  if (isShuffle) return shuffled.join("");
  return {
    iv: unshuffle(string1, seed).join("").slice(0, length1),
    message: unshuffle(string1, seed).join("").slice(length1),
  };
};

const stitch = (message, iv) => {
  return scramble(iv, message, true, 0);
};

const unStitch = (shuffledMessage) => {
  // console.log("Shuffled Message: ", shuffledMessage);
  return scramble(shuffledMessage, "", false, 16);
};

module.exports = {
  generateJwtToken,
  fileSizeFormatter,
  stitch,
  unStitch,
};
