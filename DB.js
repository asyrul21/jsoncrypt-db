const DataReadWriter = require("./DataReadWriter");
const fs = require("fs");
const path = require("path");
const { stringHasValue, objectHasMethod } = require("./utils");

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

  const validateDataObjectOnCreateForEntity = (entity, obj) => {
    if (!obj) {
      return false;
    }
    const res = entities[entity].options.validateOnCreate(obj);
    return res;
  };

  const validateDataObjectOnReadForEntity = (entity, obj) => {
    if (!obj) {
      return false;
    }
    return entities[entity].options.validateOnRead(obj);
  };

  const transformDataObjectOnCreateAndUpdateForEntity = (entity, obj) => {
    if (!obj) {
      return false;
    }
    const res = entities[entity].options.preSaveTransform(obj);
    return res;
  };

  const enrichDataWithDBProps = (obj, mode = "create") => {
    if (mode === "create") {
      return {
        ...obj,
        createdAt: (function () {
          const d = new Date();
          return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        })(),
        updatedAt: (function () {
          const d = new Date();
          return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        })(),
      };
    }
    // for updates
    return {
      ...obj,
      updatedAt: (function () {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      })(),
    };
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
    isUp: function () {
      return isRunning();
    },
    registerEntity: function (
      entity,
      options = {
        identifierKey: "id",
        validateOnCreate: (dataObj) => {
          return true;
        },
        validateOnRead: (dataObj) => {
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
    removeEntityAndDeleteEntityData: function (entity) {
      validateEntityForMethod(entity, "removeEntityAndDeleteEntityData");
      if (entity && Object.keys(entities).includes(entity)) {
        delete entities[entity];
        if (DataReadWriter.isInitialized()) {
          DataReadWriter.dropSync(entity);
        }
      }
    },
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
    getEntireDatabase: function () {
      return entityDataMap;
    },
    // force fetch allows clients to fetch data directly from database,
    // bypassing data that has been changed in memory.
    // this is generally for testing purposes only.
    findAllFor: async function (entity, forceFetch = false) {
      validateEntityForMethod(entity, "findAllFor");
      if (forceFetch) {
        // DO NOT store force fetched data in the map!
        // this will cause overriding unsaved changes, hence data loss!
        const data = await DataReadWriter.readAsync(entity);
        return data;
      }
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        // data exist in memory
        return entityDataMap[entity];
      } else {
        // fetch
        const data = await DataReadWriter.readAsync(entity);
        // update data map
        entityDataMap[entity] = data;
        return entityDataMap[entity];
      }
    },
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
    findByFilterCallbackFor: async function (entity, filterFn = () => {}) {
      validateEntityForMethod(entity, "findByFilterCallbackFor");
      let data;
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        data = entityDataMap[entity];
      } else {
        data = await DataReadWriter.readAsync(entity);
      }
      if (data.length > 0) {
        const foundItems = data.filter(filterFn);
        return foundItems;
      } else {
        throw new Error(`DB for entity [${entity}] has no data.`);
      }
    },
    createNewFor: async function (entity, obj) {
      validateEntityForMethod(entity, "createNewFor");
      const validated = validateDataObjectOnCreateForEntity(entity, obj);
      if (validated) {
        let data;
        if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
          // CHECK data exist in memory
          data = entityDataMap[entity];
        } else {
          // FETCH
          data = await DataReadWriter.readAsync(entity);
        }
        const newDataObj = transformDataObjectOnCreateAndUpdateForEntity(
          entity,
          obj
        );
        data.push(enrichDataWithDBProps(newDataObj, "create"));
        // UPDATE MEMORY
        entityDataMap[entity] = [...data];
        // RETURN
        return entityDataMap[entity];
      } else {
        throw new Error("Invalid or no data to create.");
      }
    },
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
        const validated = validateDataObjectOnCreateForEntity(entity, obj);
        if (obj && validated) {
          const newDataObj = transformDataObjectOnCreateAndUpdateForEntity(
            entity,
            obj
          );
          data.push(enrichDataWithDBProps(newDataObj, "create"));
        }
      });
      // UPDATE MEMORY
      entityDataMap[entity] = [...data];
      // RETURN
      return entityDataMap[entity];
    },
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
          const validated = validateDataObjectOnCreateForEntity(
            entity,
            updatedData
          );
          if (validated) {
            const transformedData =
              transformDataObjectOnCreateAndUpdateForEntity(
                entity,
                updatedData
              );
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
    importJSONFileForEntity: function (entity, filePath) {
      validateEntityForMethod(entity, "importJSONFileForEntity");
      if (this.isUp()) {
        throw new Error(
          "Can't import files once DB is built. Please add them before building."
        );
      }
      if (entireDBImportData && Object.keys(entireDBImportData).length !== 0) {
        throw new Error(
          "Can't import entity files if method [importJSONFileForEntireDB] was previously called. Only use [importJSONFileForEntity] OR [importJSONFileForEntireDB], but not both."
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
          "ERROR while performing module method [importJSONFileForEntity]:"
        );
        console.error(error);
        throw new Error(error.message || error);
      }
    },
    importJSONFileForEntireDB: function (filePath) {
      if (this.isUp()) {
        throw new Error(
          "Can't import data once DB is built. Please add them before building."
        );
      }
      if (entityImportData && Object.keys(entityImportData).length !== 0) {
        throw new Error(
          "Can't import entire DB if method [importJSONFileForEntity] was previously called. Only use [importJSONFileForEntity] OR [importJSONFileForEntireDB], but not both."
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
          "ERROR while performing module method [importJSONFileForEntireDB]:"
        );
        console.error(error);
        throw new Error(error.message || error);
      }
    },
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
        // create fil
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
        // create fil
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
