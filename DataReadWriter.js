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
   * entityFilesMap is a map of entity to their respective data path of the file to store data.
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

  const createDirectoryIfNotExist = function (filePath) {
    const fileDirectoryName = path.dirname(filePath);
    if (fs.existsSync(fileDirectoryName)) {
      return;
    }
    fs.mkdirSync(fileDirectoryName, { recursive: true });
    return;
  };

  const createFileIfNotExist = function (cryptor, filePath) {
    if (fs.existsSync(filePath)) {
      return;
    }
    const initDataStr = JSON.stringify([]);
    const encryptedData = cryptor.encrypt(initDataStr);
    fs.writeFileSync(filePath, encryptedData, {
      encoding: BUFFER_ENCODING,
    });
    return;
  };

  return {
    _resetAndDeleteAllData: function () {
      this._dropAllSync();
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
      options = {
        env: "dev",
        isTestMode: false,
      }
    ) {
      if (!hasBeenInitialized()) {
        // console.log("Not yet initialised! Initializing now...");
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

        /**
         * Setup options
         */
        const { env, isTestMode } = options;
        testMode = booleanHasValue(isTestMode) ? isTestMode : false;
        environment = stringHasValue(env) ? env : "dev";

        /**
         * Build entity to file path map
         */
        entityFilesMap = entities.reduce((prev, curr) => {
          const dataFilePath = testMode
            ? `${__dirname}/tests/data/${environment}/${curr}.json`
            : `${__dirname}/data/${environment}/${curr}.json`;
          createDirectoryIfNotExist(dataFilePath);
          createFileIfNotExist(cryptor, dataFilePath);
          return {
            ...prev,
            [curr.toString()]: dataFilePath,
          };
        }, {});
        return;
      }
      // console.log("Already initialised!");
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
        const dataStr = fs.readFileSync(entityFilesMap[entity], {
          encoding: BUFFER_ENCODING,
        });
        const decryptedData = cryptor.decrypt(dataStr);
        return JSON.parse(decryptedData);
      } catch (error) {
        console.log("ERROR while readSync:");
        console.error(error);
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
        const dataStr = await fsPromises.readFile(entityFilesMap[entity], {
          encoding: BUFFER_ENCODING,
        });
        const decryptedData = cryptor.decrypt(dataStr);
        return JSON.parse(decryptedData);
      } catch (error) {
        console.log("ERROR while readAsync:");
        console.error(error);
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
        fs.writeFileSync(entityFilesMap[entity], encryptedData, {
          encoding: BUFFER_ENCODING,
        });
        return data;
      } catch (error) {
        console.log("ERROR while saveSync:");
        console.error(error);
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
        await fsPromises.writeFile(entityFilesMap[entity], encryptedData, {
          encoding: BUFFER_ENCODING,
        });
        return data;
      } catch (error) {
        console.log("ERROR while saveAsync:");
        console.error(error);
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
        console.log("ERROR while dropSync:");
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    _dropAllSync: function () {
      try {
        if (entityFilesMap) {
          Object.keys(entityFilesMap).forEach((e) => {
            const path = entityFilesMap[e];
            if (fs.existsSync(path)) {
              fs.unlinkSync(path);
            }
            delete entityFilesMap[e];
          });
        }
      } catch (error) {
        console.log("ERROR while dropAllSync:");
        console.error(error);
        throw new Error(error.message || error);
      }
    },
  };
})();

module.exports = moduleFn;
