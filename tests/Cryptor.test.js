const assert = require("assert");
const fs = require("fs");
const Cryptor = require("../Cryptor");

const SAMPLE_SECRET = "sampleSecret";
const SAMPLE_VECTOR = "sampleVector";

describe("Cryptor: Initialization", () => {
  it("should intantiate successfully when all valid params are given", () => {
    let error = null;
    let cryptor;
    try {
      cryptor = new Cryptor(SAMPLE_SECRET, SAMPLE_VECTOR);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(cryptor, null);
    assert.equal(error, null);
  });

  it("should throw error when crypto secret is missing", () => {
    let error = null;
    let cryptor;
    try {
      cryptor = new Cryptor(null, SAMPLE_VECTOR);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      cryptor = new Cryptor(null, SAMPLE_VECTOR);
    });
    assert.notEqual(error, null);
  });

  it("should throw error when vector secret is missing", () => {
    let error = null;
    let cryptor;
    try {
      cryptor = new Cryptor(SAMPLE_SECRET, null);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      cryptor = new Cryptor(SAMPLE_SECRET, null);
    });
    assert.notEqual(error, null);
  });
});

describe("Cryptor: Encryption", () => {
  it("should encrypt data successfully", () => {
    let error = null;
    let cryptor;
    let encryptedData;
    const sampleData = {
      name: "John",
      age: 23,
    };
    const stringifiedSampleData = JSON.stringify(sampleData);
    try {
      cryptor = new Cryptor(SAMPLE_SECRET, SAMPLE_VECTOR);
      encryptedData = cryptor.encrypt(stringifiedSampleData);
      //   console.log("Sample data:");
      //   console.log(stringifiedSampleData);
      //   console.log("Encrypted data:");
      //   console.log(encryptedData);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.notStrictEqual(stringifiedSampleData, encryptedData);
  });
});

describe("Cryptor: Decryption", () => {
  it("should decrypt data successfully", () => {
    let error = null;
    let cryptor;
    let encryptedData;
    let decryptedData;
    let result;
    const sampleData = {
      name: "John",
      age: 23,
    };
    const stringifiedSampleData = JSON.stringify(sampleData);
    try {
      cryptor = new Cryptor(SAMPLE_SECRET, SAMPLE_VECTOR);
      encryptedData = cryptor.encrypt(stringifiedSampleData);

      decryptedData = cryptor.decrypt(encryptedData);
      result = JSON.parse(decryptedData);
      //   console.log("Sample data:");
      //   console.log(sampleData);
      //   console.log("Parsed decrypted data:");
      //   console.log(result);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, sampleData);
  });
});
