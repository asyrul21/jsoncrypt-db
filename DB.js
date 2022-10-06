const DataReadWriter = require("./DataReadWriter");
const { stringHasValue, objectHasMethod } = require("./utils");

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

  const isRunning = () => {
    return (
      entities &&
      Object.keys(entities).length > 0 &&
      entityDataMap &&
      Object.keys(entityDataMap).length > 0 &&
      DataReadWriter.isInitialized()
    );
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

  const validateDataObjectForEntity = (entity, obj) => {
    if (!obj) {
      return false;
    }
    const entityOptions = entities[entity].options;
    return objectHasMethod(entityOptions, "validateOnCreate")
      ? entityOptions.validateOnCreate(obj)
      : true;
  };

  const enrichDataWithDBProps = (obj) => {
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
  };

  return {
    _resetDBAndDeleteAllData: function () {
      entities = {};
      entityDataMap = {};
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
        entities = {
          ...entities,
          [entity]: {
            name: entity,
            options,
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
          DataReadWriter.initialize(
            cryptoSecret,
            vectorSecret,
            Object.keys(entities),
            {
              ...options,
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
        console.log("ERROR while building DB:");
        console.error(error);
        throw new Error(error.message || error);
      }
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
    createNewFor: async function (entity, obj) {
      validateEntityForMethod(entity, "createNewFor");
      const validated = validateDataObjectForEntity(entity, obj);
      if (validated) {
        let data;
        if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
          // CHECK data exist in memory
          data = entityDataMap[entity];
        } else {
          // FETCH
          data = await DataReadWriter.readAsync(entity);
        }
        data.push(enrichDataWithDBProps(obj));
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
        const validated = validateDataObjectForEntity(entity, obj);
        if (obj && validated) {
          data.push(enrichDataWithDBProps(obj));
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
          const validated = validateDataObjectForEntity(entity, updatedData);
          if (validated) {
            data.forEach((item) => {
              if (item[objIdentifierKey] === id) {
                item = { ...updatedData };
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
        console.log("ERROR while saveFor:");
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
        console.log("ERROR while saveAll:");
        console.error(error);
        throw new Error(error.message || error);
      }
    },
  };
})();

module.exports = moduleFn;
