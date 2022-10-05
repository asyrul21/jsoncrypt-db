const DataReadWriter = require("./DataReadWriter");
const { stringHasValue, objectHasMethod } = require("./utils");

const moduleFn = (function () {
  /**
   * entites is a key-value map of unique, plural
   * string values, used to initialize the DataReadWriter
   *
   * eg.
   * {
   *    categories: "categories",
   *    comments: "comments"
   * }
   */
  let entities = {};

  /**
   * entityDataMap stores in memory all data mapped to each entity. This is
   * to prevent multiple reading and writing of data files.
   *
   * eg.
   * {
   *    categories: "categories",
   *    comments: "comments"
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

  return {
    _resetDBAndDeleteAllData: function () {
      entities = {};
      entityDataMap = {};
      if (DataReadWriter.isInitialized()) {
        DataReadWriter._resetAndDeleteAllData();
      }
    },
    getEntities: function () {
      return entities;
    },
    isUp: function () {
      return isRunning();
    },
    registerEntity: function (entity) {
      if (!entity || typeof entity !== "string") {
        throw new Error(
          "Invalid parameter [entity] provided for function [registerEntity]."
        );
      }
      if (entities && !Object.keys(entities).includes(entity)) {
        entities = { ...entities, [entity]: entity };
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
        console.log("ERROR while initializing DataReadWriter:");
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
    createNewFor: async function (entity, obj) {
      validateEntityForMethod(entity, "createNewFor");
      const newData = objectHasMethod(obj, "getDataObject")
        ? obj.getDataObject()
        : obj;
      const validated = objectHasMethod(obj, "validate")
        ? obj.validate()
        : true;
      if (newData && validated) {
        let data;
        if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
          // CHECK data exist in memory
          data = entityDataMap[entity];
        } else {
          // FETCH
          data = await DataReadWriter.readAsync(entity);
        }
        data.push(newData);
        // UPDATE MEMORY
        entityDataMap[entity] = [...data];
        // RETURN
        return entityDataMap[entity];
      } else {
        throw new Error("Invalid or no data to be created.");
      }
    },
    createManyNewFor: async function (entity, objDataArray) {
      validateEntityForMethod(entity, "createNewFor");
      if (!objDataArray || objDataArray.length < 1) {
        return (entityDataMap[entity] = [...data]);
      }
      let data;
      if (entityDataMap && Object.keys(entityDataMap).includes(entity)) {
        data = entityDataMap[entity];
      } else {
        data = await DataReadWriter.readAsync(entity);
      }
      objDataArray.forEach((obj) => {
        const newData = objectHasMethod(obj, "getDataObject")
          ? obj.getDataObject()
          : obj;
        const validated = objectHasMethod(obj, "validate")
          ? obj.validate()
          : true;
        if (newData && validated) {
          data.push(newData);
        }
      });
      // UPDATE MEMORY
      entityDataMap[entity] = [...data];
      // RETURN
      return entityDataMap[entity];
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
