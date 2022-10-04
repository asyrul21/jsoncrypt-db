const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const Cryptor = require("./Cryptor");
const { stringHasValue, arrayHasValue, booleanHasValue } = require("./utils");

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
   * environemnt enables data to be stored and retrieved in to/from different folders
   * depending on which environemnt the client is on. Typically the value is either
   * "dev" or "prod" or "test"
   */
  let environment = "dev";

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

  // const getDataFilePathBasedOnEntity = function (entity) {
  //   return testMode
  //     ? `${__dirname}/tests/data/${environment}/${entityFilesMap[entity]}`
  //     : `${__dirname}/data/${environment}/${entityFilesMap[entity]}`;
  // };

  const createDirectoryIfNotExist = async function (filePath) {
    const fileDirectoryName = path.dirname(filePath);
    if (fs.existsSync(fileDirectoryName)) {
      return;
    }
    fs.mkdirSync(fileDirectoryName);
    return;
  };

  return {
    _reset: function () {
      cryptor = null;
      entityFilesMap = null;
    },
    isInitialized: function () {
      return hasBeenInitialized();
    },
    initialize: function (
      cryptoSecret,
      vectorSecret,
      entities,
      env = "dev",
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
        testMode = booleanHasValue(isTestMode) ? isTestMode : false;
        environment = stringHasValue(env) ? env : "dev";
        entityFilesMap = entities.reduce((prev, curr) => {
          const dataFilePath = testMode
            ? `${__dirname}/tests/data/${environment}/${curr}.json`
            : `${__dirname}/data/${environment}/${curr}.json`;
          createDirectoryIfNotExist(dataFilePath);
          return {
            ...prev,
            [curr.toString()]: dataFilePath,
          };
        }, {});
        return;
      }
      //   console.log("Already initialised!");
    },
    getEntityFilesMap: function () {
      return entityFilesMap;
    },
    readSync: function (entity) {
      if (!hasBeenInitialized()) {
        throw new Error(
          `Data Store has not been initialized yet. Make sure to initialize the module before performing data-related operations.`
        );
      }
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file READ.`
        );
      }
      try {
        const dataStr = fs.readFileSync(path.resolve(entityFilesMap[entity]), {
          encoding: BUFFER_ENCODING,
        });
        const decryptedData = cryptor.decrypt(dataStr);
        return JSON.parse(decryptedData);
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
    readAsync: async function (entity) {
      if (!hasBeenInitialized()) {
        throw new Error(
          `Data Store has not been initialized yet. Make sure to initialize the module before performing data-related operations.`
        );
      }
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file READ.`
        );
      }
      try {
        const dataStr = await fsPromises.readFile(
          path.resolve(entityFilesMap[entity]),
          {
            encoding: BUFFER_ENCODING,
          }
        );
        const decryptedData = cryptor.decrypt(dataStr);
        return JSON.parse(decryptedData);
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
    saveSync: function (entity, data) {
      if (!hasBeenInitialized()) {
        throw new Error(
          `Data Store has not been initialized yet. Make sure to initialize the module before performing data-related operations.`
        );
      }
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file WRITE.`
        );
      }
      try {
        const dataStr = JSON.stringify(data);
        const encryptedData = cryptor.encrypt(dataStr);

        fs.writeFileSync(path.resolve(entityFilesMap[entity]), encryptedData, {
          encoding: BUFFER_ENCODING,
        });
        return data;
      } catch (error) {
        console.log("ERROR while saveSync");
        console.log(error);
        throw new Error(error.message || error);
      }
    },
    saveAsync: async function (entity, data) {
      if (!hasBeenInitialized()) {
        throw new Error(
          `Data Store has not been initialized yet. Make sure to initialize the module before performing data-related operations.`
        );
      }
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file WRITE.`
        );
      }
      try {
        const dataStr = JSON.stringify(data);
        const encryptedData = cryptor.encrypt(dataStr);
        await fsPromises.writeFile(
          path.resolve(entityFilesMap[entity]),
          encryptedData,
          {
            encoding: BUFFER_ENCODING,
          }
        );
        return data;
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
    dropSync: function (entity) {
      if (!hasBeenInitialized()) {
        throw new Error(
          `Data Store has not been initialized yet. Make sure to initialize the module before performing data-related operations.`
        );
      }
      if (!entityIsValid(entity)) {
        throw new Error(
          `Invalid entity value [${entity}] provided for file READ.`
        );
      }
      try {
        const path = entityFilesMap[entity];
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
        }
        delete entityFilesMap[entity];
      } catch (error) {
        throw new Error(error.message || error);
      }
    },
    dropAllSync: function () {
      try {
        if (entityFilesMap) {
          Object.keys(entityFilesMap).forEach((e) => {
            const path = entityFilesMap[e];
            if (fs.existsSync(path)) {
              fs.unlinkSync(path);
            }
            delete entityFilesMap[e];
          });
          entityFilesMap = null;
        }
      } catch (error) {
        console.log(error);
        throw new Error(error.message || error);
      }
    },
  };
})();

module.exports = moduleFn;
