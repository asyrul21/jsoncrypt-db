const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const Cryptor = require("./Cryptor");
const { stringHasValue, arrayHasValue } = require("./utils");

const BUFFER_ENCODING = "utf-8";

const moduleFn = (function () {
  /**
   * cryptor encrypts and decrypts data to be used before and after
   * file read and write operations
   */
  let cryptor = null;

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
  let entityFilesMap = null;

  /**
   * testMode is to use test folders when reading/writing data
   */
  let testMode = false;

  const entityIsValid = function (entity) {
    if (!entity) {
      return false;
    }
    return Object.keys(entityFilesMap).includes(entity);
  };

  const hasBeenInitialized = function () {
    return (
      cryptor && cryptor !== null && entityFilesMap && entityFilesMap !== null
    );
  };

  const getDataFilePathBasedOnEntity = function (entity) {
    return testMode
      ? `${__dirname}/tests/data/${entityFilesMap[entity]}`
      : `${__dirname}/data/${entityFilesMap[entity]}`;
  };

  return {
    _reset: function () {
      cryptor = null;
      entityFilesMap = null;
    },
    initialize: function (
      cryptoSecret,
      vectorSecret,
      entities,
      isTestMode = false
    ) {
      if (!hasBeenInitialized()) {
        // console.log("Not yet initialised!");
        if (
          !stringHasValue(cryptoSecret) ||
          !stringHasValue(vectorSecret) ||
          !arrayHasValue(entities)
        ) {
          throw new Error(
            "Initialization arguments [cryptoSecret], [vectorSecret], and [entities] must be provided."
          );
        }
        cryptor = new Cryptor(cryptoSecret, vectorSecret);
        entityFilesMap = entities.reduce((prev, curr) => {
          return {
            ...prev,
            [curr.toString()]: `${curr}.json`,
          };
        }, {});
        testMode = isTestMode;
        return;
      }
      //   console.log("Already initialised!");
    },
    getEntityFilesMap: function () {
      return entityFilesMap;
    },
    readSync: function (entity) {
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file READ.`
        );
      }
      try {
        const dataFilePath = getDataFilePathBasedOnEntity(entity);
        const dataStr = fs.readFileSync(path.resolve(dataFilePath), {
          encoding: BUFFER_ENCODING,
        });
        const decryptedData = cryptor.decrypt(dataStr);
        return JSON.parse(decryptedData);
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
    readAsync: async function (entity) {
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file READ.`
        );
      }
      try {
        const dataFilePath = getDataFilePathBasedOnEntity(entity);
        const dataStr = await fsPromises.readFile(path.resolve(dataFilePath), {
          encoding: BUFFER_ENCODING,
        });
        const decryptedData = cryptor.decrypt(dataStr);
        return JSON.parse(decryptedData);
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
    saveSync: function (entity, data) {
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file WRITE.`
        );
      }
      try {
        const dataStr = JSON.stringify(data);
        const encryptedData = cryptor.encrypt(dataStr);
        const dataFilePath = getDataFilePathBasedOnEntity(entity);
        fs.writeFileSync(path.resolve(dataFilePath), encryptedData, {
          encoding: BUFFER_ENCODING,
        });
        return data;
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
    saveAsync: async function (entity, data) {
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file WRITE.`
        );
      }
      try {
        const dataStr = JSON.stringify(data);
        const encryptedData = cryptor.encrypt(dataStr);
        const dataFilePath = getDataFilePathBasedOnEntity(entity);
        await fsPromises.writeFile(path.resolve(dataFilePath), encryptedData, {
          encoding: BUFFER_ENCODING,
        });
        return data;
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
  };
})();

module.exports = moduleFn;
