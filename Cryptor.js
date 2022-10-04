const crypto = require("crypto");
const { stringHasValue } = require("./utils");

class Cryptor {
  #securityKey;
  #algorithm;
  #initVector;
  constructor(cryptoSecret, vectorSecret) {
    if (!stringHasValue(cryptoSecret) || !stringHasValue(vectorSecret)) {
      throw new Error(
        "Constructor parameters [cryptoSecret] and [vectorSecret] is required."
      );
    }
    this.#securityKey = crypto
      .createHash("sha256")
      .update(String(cryptoSecret))
      .digest("base64")
      .substring(0, 32);
    this.#algorithm = "aes-256-cbc";
    this.#initVector = crypto
      .createHash("sha256")
      .update(String(vectorSecret).split("").reverse().join(""))
      .digest("base64")
      .substring(0, 16);
  }

  encrypt(dataStr) {
    const encryptor = crypto.createCipheriv(
      this.#algorithm,
      this.#securityKey,
      this.#initVector
    );
    let encryptedData = encryptor.update(dataStr, "utf-8", "hex");
    encryptedData += encryptor.final("hex");
    return encryptedData;
  }

  decrypt(dataStr) {
    const decryptor = crypto.createDecipheriv(
      this.#algorithm,
      this.#securityKey,
      this.#initVector
    );
    let decryptedData = decryptor.update(dataStr, "hex", "utf-8");
    decryptedData += decryptor.final("utf-8");
    return decryptedData;
  }
}

module.exports = Cryptor;
