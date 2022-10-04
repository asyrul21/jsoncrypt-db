// https://medium.com/swlh/node-js-and-singleton-pattern-7b08d11c726a

const fs = require("fs");
const path = require("path");
const Cryptor = require("./Cryptor");
const { stringHasValue, arrayHasValue } = require("./utils");

class DataReadWriter {
  /**
   * cryptor encrypts and decrypts data to be used before and after
   * file read and write operations
   */
  #cryptor;

  /**
   * entities is a map of entity to their respective filenames to store data.
   * Example:
   *   const ENTITIES = {
   *    test: "test.json",
   *    admin: "admin.json",
   *    categories: "categories.json",
   *    sources: "sources.json",
   *    comments: "comments.json",
   *    };
   */
  #entityFilesMap;

  /**
   *
   * @param {string} cryptoSecret - a secret string value to be used for data encryption/decryption. This value is normally stored in .env file. Eg. "mySecretKey"
   * @param {string} vectorSecret - another secret string value to be used for data encryption/decryption. This value is normally stored in .env file. Eg. "mySecretVector"
   * @param {string[]} entities - an array of string indicating various data model names involved in the client app. Each string must be: 1) Unique 2) Plural word
   *                            - eg. ["users", "products", "categories"]
   */
  constructor(cryptoSecret, vectorSecret, entities) {
    if (
      !stringHasValue(cryptoSecret) ||
      !stringHasValue(vectorSecret) ||
      !arrayHasValue(entities)
    ) {
      throw new Error(
        "Constructor arguments [cryptoSecret], [vectorSecret], and [entities] must be provided."
      );
    }
    this.#cryptor = new Cryptor(cryptoSecret, vectorSecret);
    this.#entityFilesMap = entities.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: `${curr}.json`,
      };
    }, {});
  }

  #entityIsValid(entity) {
    if (!entity) {
      return false;
    }
    return Object.keys(this.#entityFilesMap).includes(entity);
  }

  getEntityFilesMap() {
    return this.#entityFilesMap;
  }

  readSync(entity) {
    if (!this.#entityIsValid(entity)) {
      throw new Error("Invalid entity value provided for file READ.");
    }
    try {
      const dataStr = fs.readFileSync(
        path.resolve(`${__dirname}/data/${this.#entityFilesMap[entity]}`),
        {
          encoding: "utf-8",
        }
      );
      const decryptedData = this.#cryptor.decrypt(dataStr);
      return JSON.parse(decryptedData);
    } catch (error) {
      throw new Error(error.message || error);
    }
  }

  saveSync(entity, data) {
    if (!this.#entityIsValid(entity)) {
      throw new Error("Invalid entity value provided for file WRITE.");
    }
    try {
      const dataStr = JSON.stringify(data);
      const encryptedData = this.#cryptor.encrypt(dataStr);
      fs.writeFileSync(
        path.resolve(`${__dirname}/data/${this.#entityFilesMap[entity]}`),
        encryptedData
      );
      return data;
    } catch (error) {
      throw new Error(error.message || error);
    }
  }
}

class ModuleSingleton {
  /**
   * instance to ensure Singleton behaviour
   */
  instance = null;

  /**
   * instanceCount for testing Singleton behaviour
   */
  instanceCount = 0;

  constructor() {
    throw new Error(
      "Module singleton is not meant to be instantiated. Use the [getInstance] static method instead."
    );
  }

  static getInstance(cryptoSecret, vectorSecret, entities) {
    if (!ModuleSingleton._instance) {
      ModuleSingleton._instance = new DataReadWriter(
        cryptoSecret,
        vectorSecret,
        entities
      );
      //   ModuleSingleton.instanceCount += 1;
    }
    return ModuleSingleton._instance;
  }
}

module.exports = ModuleSingleton;
