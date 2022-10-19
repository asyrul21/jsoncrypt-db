const DataReadWriter = require("./DataReadWriter");
const fs = require("fs");
const path = require("path");
const {
  stringHasValue,
  objectHasMethod,
  enrichDataWithDBProps,
} = require("./utils");

const BUFFER_ENCODING = "utf-8";
const DEFAULT_ENTITY_EXPORT_FILENAME = (entity) => {
  return `db_export_${entity}.json`;
};

const moduleFn = (function () {
  /**
   * entites is a key-value map of unique, plural
   * string values, used to initialize the DataReadWriter
   *
   * eg.
   * {
   *    categories: {
   *        name: "categories",
   *        options: {
   *            identifierKey: "id",
   *            validateOnCreate: (dataObj) => {
   *                return true;
   *            },
   *        }
   *    },
   *    comments: {
   *        name: "comments",
   *        options: {
   *            identifierKey: "id",
   *            validateOnCreate: (dataObj) => {
   *                return true;
   *        }
   *    }
   * }
   */
  let entities = {};

  /**
   * entityDataMap stores in memory all data mapped to each entity. This is
   * to prevent multiple reading and writing of data files.
   *
   * eg.
   * {
   *    categories: [ ... data ...],
   *    comments: [ ...data... ]
   * }
   */
  let entityDataMap = {};

  // both entityImportData and entireDBImport data have the same structure
  let entityImportData = {};
  let entireDBImportData = {};

  const isRunning = () => {
    return (
      entities &&
      Object.keys(entities).length > 0 &&
      entityDataMap &&
      Object.keys(entityDataMap).length > 0 &&
      DataReadWriter.isInitialized()
    );
  };

  const generateImportedData = () => {
    let result;
    if (entireDBImportData && Object.keys(entireDBImportData).length !== 0) {
      result = { ...entireDBImportData };
      entireDBImportData = {};
    } else if (entityImportData && Object.keys(entityImportData).length !== 0) {
      result = { ...entityImportData };
      entityImportData = {};
    } else {
      result = null;
    }
    return result;
  };

  const validateEntityImportDataStructure = (data) => {
    /**
     * Import data structure must be a list of objects
     */
    if (!data || typeof data !== "object" || !data[0]) {
      throw new Error(
        "Import data provided for entity does not have a valid structure. Top level structure must be a list/array."
      );
    }
    if ((data[0] && !typeof data[0] === "object") || data[0][0]) {
      throw new Error(
        "Import data provided for entity does not have a valid structure. Top level list must contain entity objects of type [object]"
      );
    }
  };

  const validateEntireDBStructure = (data) => {
    /**
     * Import data structure must be an object with key entity name and value a list of entity objects.
     * This is exactly similar to the structure of entityDataMap.
     *
     * eg:
     *
     * {
     *    categories: [ ... data ...],
     *    comments: [ ...data... ]
     * }
     *
     */
    if (!data || typeof data !== "object" || data[0]) {
      throw new Error(
        "Import entire DB data provided does not have a valid structure. Top level DB structure must be a an object."
      );
    }
    let invalidEntityStructures = [];
    // validate structure of every entity data
    Object.keys(data).forEach((e) => {
      try {
        validateEntityImportDataStructure(data[e]);
      } catch (error) {
        invalidEntityStructures.push(e);
      }
    });
    if (invalidEntityStructures.length > 0) {
      throw new Error(
        `Import entire DB data failed. Entity keys ${invalidEntityStructures.toString()} must a list/array containing entity objects as values.`
      );
    }
  };

  const validateEntityForMethod = (entity, methodName) => {
    if (
      !entity ||
      typeof entity !== "string" ||
      !Object.keys(entities).includes(entity)
    ) {
      throw new Error(
        `Invalid parameter [entity] provided for function [${methodName}].`
      );
    }
  };

  const validateObjParamForMethod = (obj, methodName) => {
    if (!obj || typeof obj !== "object" || Object.keys(obj).length === 0) {
      throw new Error(
        `Invalid parameter [dataObject] provided for function [${methodName}].`
      );
    }
  };

  return {
    _resetDBAndDeleteAllData: function () {
      entities = {};
      entityDataMap = {};
      entityImportData = {};
      entireDBImportData = {};
      if (DataReadWriter.isInitialized()) {
        DataReadWriter._resetAndDeleteAllData();
      }
    },
    /**
     *
     * @returns An object with entityNames as keys and their respective string values as values.
     */
    getEntities: function () {
      let result = {};
      if (entities && Object.keys(entities).length > 0) {
        result = Object.keys(entities).reduce((acc, curr) => {
          return {
            ...acc,
            [curr]: entities[curr].name,
          };
        }, {});
      }
      return result;
    },
    /**
     *
     * @returns a boolean value; true if database has been setup, built and is currently storing data, false otherwise.
     */
    isUp: function () {
      return isRunning();
    },
    /**
     *
     * @param {string}    entity - Should be a single string of a PLURAL word. eg. "categories"
     * @param {Object}    [options] - (optional) Register entity options
     * @param {string}    options.identifierKey - Default is "id".
     * @param {function}  options.validateOnCreate - hook: a validation callback every time a new data object is created/updated. Default is a function that returns true.
     * @param {function}  options.preSaveTransform - hook: a callback to perform transformations of data objects for that entity every time before it is created/updated in the data store.  Default is a function that returns the entity data object itself.
     *
     */ registerEntity: function (
      entity,
      options = {
        identifierKey: "id",
        validateOnCreate: (dataObj) => {
          return true;
        },
        preSaveTransform: (dataObj) => {
          return { ...dataObj };
        },
      }
    ) {
      if (this.isUp()) {
        throw new Error(
          "Can't add entities once DB is built. Please add them before building."
        );
      }
      if (!entity || typeof entity !== "string") {
        throw new Error(
          "Invalid parameter [entity] provided for function [registerEntity]."
        );
      }

      if (entities && !Object.keys(entities).includes(entity)) {
        // hook preparations
        const validateCreateHook = objectHasMethod(options, "validateOnCreate")
          ? options.validateOnCreate
          : (dataObj) => {
              return true;
            };
        const transformHook = objectHasMethod(options, "preSaveTransform")
          ? options.preSaveTransform
          : (dataObj) => {
              return { ...dataObj };
            };

        // compose
        entities = {
          ...entities,
          [entity]: {
            name: entity,
            options: {
              ...options,
              validateOnCreate: validateCreateHook,
              preSaveTransform: transformHook,
            },
          },
        };
      }
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     */
    removeEntityAndDeleteEntityData: function (entity) {
      validateEntityForMethod(entity, "removeEntityAndDeleteEntityData");
      if (entity && Object.keys(entities).includes(entity)) {
        delete entities[entity];
        if (DataReadWriter.isInitialized()) {
          DataReadWriter.dropSync(entity);
        }
      }
    },
    /**
     *
     * @param {string}  cryptoSecret - secret encryption message
     * @param {string}  vectorSecret - another secret encryption message
     * @param {Object}  [options] - Build Options
     * @param {string}  options.env - Default is "dev".
     * @param {boolean} options.isTestMode - Default is false.
     */
    build: function (
      cryptoSecret,
      vectorSecret,
      options = {
        env: "dev",
        isTestMode: false,
      }
    ) {
      if (!stringHasValue(cryptoSecret) || !stringHasValue(vectorSecret)) {
        throw new Error(
          "Initialization arguments [cryptoSecret] and [vectorSecret] must be provided."
        );
      }
      if (!entities || Object.keys(entities).length < 1) {
        throw new Error(
          "No entities have been registered. Use module method [registerEntity] to register entities."
        );
      }
      try {
        if (!DataReadWriter.isInitialized()) {
          const dataImport = generateImportedData();
          DataReadWriter.initialize(
            cryptoSecret,
            vectorSecret,
            Object.keys(entities),
            {
              ...options,
              dataImport,
            }
          );
        }
        // if success, populate data store
        if (DataReadWriter.isInitialized()) {
          Object.keys(entities).forEach((e) => {
            entityDataMap = {
              ...entityDataMap,
              [e]: DataReadWriter.readSync(e),
            };
          });
        }
        console.log("SIMPLE DB BUILD SUCCESS!");
      } catch (error) {
        console.log("ERROR while performing module method [build]:");
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    /**
     *
     * @returns The entire application's data.
     */
    getEntireDatabase: function () {
      return entityDataMap;
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {function} filterCallback - A callback function for filtering specific fields with specific values.
     * @param {boolean} forceFetch - Allows clients to fetch data directly from database, bypassing data that has been changed in memory. This is generally for testing purposes only.
     * @returns An array of data objects for that entity.
     */
    findFor: async function (
      entity,
      filterCallback = null,
      forceFetch = false
    ) {
      validateEntityForMethod(entity, "findAllFor");
      const filterCbProvided =
        filterCallback && typeof filterCallback === "function";
      if (forceFetch) {
        // DO NOT store force fetched data in the map!
        // this will cause overriding unsaved changes, hence data loss!
        const data = await DataReadWriter.readAsync(entity);
        return filterCbProvided ? data?.filter(filterCallback) : data;
      }
      let data;
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        data = entityDataMap[entity];
      } else {
        data = await DataReadWriter.readAsync(entity);
      }
      return filterCbProvided ? data.filter(filterCallback) : data;
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {string} id - The id of the data object to be retrieved.
     * @returns An object with the specified ID. Throws error if not found.
     */
    findByIdentifierFor: async function (entity, id) {
      validateEntityForMethod(entity, "findByIdentifierFor");
      let data;
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        data = entityDataMap[entity];
      } else {
        data = await DataReadWriter.readAsync(entity);
      }
      if (data.length > 0) {
        const entityOptions = entities[entity].options;
        const objIdentifierKey = entityOptions.identifierKey
          ? entityOptions.identifierKey
          : "id";
        const foundItems = data.filter((item) => item[objIdentifierKey] === id);
        if (foundItems.length > 0) {
          return foundItems[0];
        } else {
          throw new Error("Invalid or no data with given identifier.");
        }
      } else {
        throw new Error(`DB for entity [${entity}] has no data.`);
      }
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {Object} obj - New data object to be added/created for that entity.
     * @returns an updated array of data objects for that entity.
     */
    createNewFor: async function (entity, obj) {
      validateEntityForMethod(entity, "createNewFor");
      validateObjParamForMethod(obj, "createNewFor");
      const validated = entities[entity].options.validateOnCreate(obj);
      if (validated) {
        let data;
        if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
          // CHECK data exist in memory
          data = entityDataMap[entity];
        } else {
          // FETCH
          data = await DataReadWriter.readAsync(entity);
        }
        const newDataObj = entities[entity].options.preSaveTransform(obj);
        data.push(enrichDataWithDBProps(newDataObj, "create"));
        // UPDATE MEMORY
        entityDataMap[entity] = [...data];
        // RETURN
        return entityDataMap[entity];
      } else {
        throw new Error("Invalid or no data to create.");
      }
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {Object[]} objDataArray - A list/array of new data objects to be added/created for that entity.
     * @returns an updated array of data objects for that entity.
     */
    createManyNewFor: async function (entity, objDataArray) {
      validateEntityForMethod(entity, "createNewFor");
      if (!objDataArray || objDataArray.length < 1) {
        throw new Error("No data to create.");
      }
      let data;
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        data = entityDataMap[entity];
      } else {
        data = await DataReadWriter.readAsync(entity);
      }
      objDataArray.forEach((obj) => {
        const validated = entities[entity].options.validateOnCreate(obj);
        if (obj && validated) {
          const newDataObj = entities[entity].options.preSaveTransform(obj);
          data.push(enrichDataWithDBProps(newDataObj, "create"));
        }
      });
      // UPDATE MEMORY
      entityDataMap[entity] = [...data];
      // RETURN
      return entityDataMap[entity];
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {string} id - The id of the data object to be updated.
     * @param {Object} newData - An object containing the key - value pairs of which fields to update and with what values.
     * @returns an updated array of data objects for that entity.
     */
    updateFor: async function (entity, id, newData) {
      validateEntityForMethod(entity, "updateFor");
      if (!id || !newData) {
        throw new Error(
          "Arguments [id] and [newData] must be provided in method [updateFor]."
        );
      }
      let data;
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        data = entityDataMap[entity];
      } else {
        data = await DataReadWriter.readAsync(entity);
      }
      if (data.length > 0) {
        const entityOptions = entities[entity].options;
        const objIdentifierKey = entityOptions.identifierKey
          ? entityOptions.identifierKey
          : "id";
        const foundItems = data.filter((item) => item[objIdentifierKey] === id);
        if (foundItems.length > 0) {
          let updatedData = foundItems[0];
          Object.keys(newData).forEach((k) => {
            // prevent updating id value
            if (k !== objIdentifierKey) {
              updatedData[k] = newData[k];
            }
          });
          const validated =
            entities[entity].options.validateOnCreate(updatedData);
          if (validated) {
            const transformedData =
              entities[entity].options.preSaveTransform(updatedData);
            const enrichedData = enrichDataWithDBProps(
              transformedData,
              "update"
            );
            data.forEach((item) => {
              if (item[objIdentifierKey] === id) {
                item = { ...enrichedData };
              }
            });
            // UPDATE MEMORY
            entityDataMap[entity] = [...data];
            // RETURN
            return entityDataMap[entity];
          } else {
            throw new Error("Updated values for data failed validation.");
          }
        } else {
          throw new Error("Invalid or no data with given identifier.");
        }
      } else {
        throw new Error(`DB for entity [${entity}] has no data.`);
      }
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {string} id - The id of the data object to be updated.
     * @returns an updated array of data objects for that entity.
     */
    deleteFor: async function (entity, id) {
      validateEntityForMethod(entity, "deleteFor");
      if (!id) {
        throw new Error(
          "Argument [id] must be provided in method [updateFor]."
        );
      }
      let data;
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        data = entityDataMap[entity];
      } else {
        data = await DataReadWriter.readAsync(entity);
      }
      if (data.length > 0) {
        const entityOptions = entities[entity].options;
        const objIdentifierKey = entityOptions.identifierKey
          ? entityOptions.identifierKey
          : "id";

        const updatedData = data.filter(
          (item) => item[objIdentifierKey] !== id
        );
        // UPDATE MEMORY
        entityDataMap[entity] = [...updatedData];
        // RETURN
        return entityDataMap[entity];
      } else {
        throw new Error(`DB for entity [${entity}] has no data.`);
      }
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     */
    saveFor: async function (entity) {
      validateEntityForMethod(entity, "saveFor");
      try {
        await DataReadWriter.saveAsync(entity, entityDataMap[entity]);
      } catch (e) {
        console.log("ERROR while performing module method [saveFor]:");
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    saveAll: async function () {
      try {
        const savePromises = Object.keys(entityDataMap).map((e) => {
          DataReadWriter.saveAsync(e, entityDataMap[e]);
        });
        await Promise.all(savePromises);
      } catch (error) {
        console.log("ERROR while performing module method [saveAll]:");
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {string} filePath - Path to your json file. Make sure to include the .json extension.
     */
    importDataFromJSONFileForEntity: function (entity, filePath) {
      validateEntityForMethod(entity, "importDataFromJSONFileForEntity");
      if (this.isUp()) {
        throw new Error(
          "Can't import files once DB is built. Please add them before building."
        );
      }
      if (entireDBImportData && Object.keys(entireDBImportData).length !== 0) {
        throw new Error(
          "Can't import entity files if method [importDataFromJSONFileForEntireDB] was previously called. Only use [importDataFromJSONFileForEntity] OR [importDataFromJSONFileForEntireDB], but not both."
        );
      }
      try {
        const fileExt = path.extname(filePath);
        if (fileExt !== ".json") {
          throw new Error(
            "Invalid file extension. Imports are only readable from JSON files."
          );
        }
        const dataStr = fs.readFileSync(filePath, {
          encoding: BUFFER_ENCODING,
        });
        const data = JSON.parse(dataStr);
        // check structure
        validateEntityImportDataStructure(data);
        // add to map
        entityImportData[entity] = [...data];
      } catch (error) {
        console.log(
          "ERROR while performing module method [importDataFromJSONFileForEntity]:"
        );
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    /**
     *
     * @param {string} filePath - Path to your json file. Make sure to include the .json extension.
     */
    importDataFromJSONFileForEntireDB: function (filePath) {
      if (this.isUp()) {
        throw new Error(
          "Can't import data once DB is built. Please add them before building."
        );
      }
      if (entityImportData && Object.keys(entityImportData).length !== 0) {
        throw new Error(
          "Can't import entire DB if method [importDataFromJSONFileForEntity] was previously called. Only use [importDataFromJSONFileForEntity] OR [importDataFromJSONFileForEntireDB], but not both."
        );
      }
      try {
        const fileExt = path.extname(filePath);
        if (fileExt !== ".json") {
          throw new Error(
            "Invalid file extension. Imports are only readable from JSON files."
          );
        }
        const dataStr = fs.readFileSync(filePath, {
          encoding: BUFFER_ENCODING,
        });
        const data = JSON.parse(dataStr);
        // check structure
        validateEntireDBStructure(data);
        // add to map
        entireDBImportData = { ...data };
      } catch (error) {
        console.log(
          "ERROR while performing module method [importDataFromJSONFileForEntireDB]:"
        );
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    /**
     *
     * @param {string} entity - The name of a registered entity. Please use the .getEntities() method to avoid spelling mistakes.
     * @param {string} folderPath - Path to the folder you want to export the data to.
     * @param {string} [filename] - (optional) The name of the file you want to save the exported data to. Default is: db_export_${entity}.json
     */
    exportDataToJSONForEntity: function (entity, folderPath, filename = null) {
      validateEntityForMethod(entity, "exportDataToJSONForEntity");
      if (!folderPath) {
        throw new Error(
          "Argument [folderPath] is required for module method [exportDataToJSONForEntity]."
        );
      }
      try {
        const dataStr = JSON.stringify(entityDataMap[entity]);
        // create folder if not exist
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        let basename = filename
          ? filename
          : DEFAULT_ENTITY_EXPORT_FILENAME(entity);
        if (path.extname(basename) === "") {
          basename += ".json";
        } else if (
          path.extname(basename) &&
          path.extname(basename) !== ".json"
        ) {
          // undo folder creation
          fs.rmSync(folderPath, { recursive: true, force: true });
          throw new Error(
            "Invalid file extension. Exports are only writable to JSON files."
          );
        }
        // create file
        fs.writeFileSync(`${path.resolve(folderPath, basename)}`, dataStr, {
          encoding: BUFFER_ENCODING,
        });
      } catch (error) {
        console.log(
          "ERROR while performing module method [exportDataToJSONForEntity]:"
        );
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    /**
     *
     * @param {string} folderPath - Path to the folder you want to export the data to.
     * @param {string} [filename] - (optional) filename: The name of the file you want to save the exported data to. Default is: db_export_all.json
     */
    exportEntireDatabaseToJSON: function (folderPath, filename = null) {
      if (!folderPath) {
        throw new Error(
          "Argument [folderPath] is required for module method [exportEntireDatabaseToJSON]."
        );
      }
      try {
        const dataStr = JSON.stringify(entityDataMap);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        let basename = filename
          ? filename
          : DEFAULT_ENTITY_EXPORT_FILENAME("all");
        if (path.extname(basename) === "") {
          basename += ".json";
        } else if (
          path.extname(basename) &&
          path.extname(basename) !== ".json"
        ) {
          // undo folder creation
          fs.rmSync(folderPath, { recursive: true, force: true });
          throw new Error(
            "Invalid file extension. Exports are only writable to JSON files."
          );
        }
        // create file
        fs.writeFileSync(`${path.resolve(folderPath, basename)}`, dataStr, {
          encoding: BUFFER_ENCODING,
        });
      } catch (error) {
        console.log(
          "ERROR while performing module method [exportEntireDatabaseToJSON]:"
        );
        console.error(error);
        throw new Error(error.message || error);
      }
    },
  };
})();

module.exports = moduleFn;
