const assert = require("assert");
const fs = require("fs");
const { DB } = require("../");

const SAMPLE_SECRET = "sampleSecret";
const SAMPLE_VECTOR = "sampleVector";
const SAMPLE_ENTITIES = ["categories", "comments"];

const getEntitiesMap = (entities, env = "dev") => {
  return entities.reduce((prev, curr) => {
    const dataFilePath = `${__dirname}/data/${env}/${curr}.json`;
    return {
      ...prev,
      [curr.toString()]: dataFilePath,
    };
  }, {});
};

describe("Data Read Writer: Initialisation", () => {
  after(() => {
    DB._resetAndDeleteAllData();
  });

  it("should instantiate successfully when all valid parameters are given", () => {
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(DB, null);
    assert.equal(error, null);
    assert.deepEqual(DB.getEntityFilesMap(), getEntitiesMap(SAMPLE_ENTITIES));
  });

  it("should instantiate successfully when module has been initialized else where", () => {
    let error = null;
    try {
      DB.initialize();
      DB.initialize();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(DB, null);
    assert.equal(error, null);
    assert.deepEqual(DB.getEntityFilesMap(), getEntitiesMap(SAMPLE_ENTITIES));
    assert.equal(DB.isInitialized(), true);
  });

  it("should return map data successfully when module has been initialized else where", () => {
    assert.deepEqual(DB.getEntityFilesMap(), getEntitiesMap(SAMPLE_ENTITIES));
  });

  it("should throw error when crypto secret is missing", () => {
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      DB.initialize(null, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DB._resetAndDeleteAllData();
    assert.throws(() => {
      DB.initialize(null, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });

  it("should throw error when vector secret is missing", () => {
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      DB.initialize(SAMPLE_SECRET, null, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DB._resetAndDeleteAllData();
    assert.throws(() => {
      DB.initialize(SAMPLE_SECRET, null, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });

  it("should throw error when entites array is missing", () => {
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, null, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DB._resetAndDeleteAllData();
    assert.throws(() => {
      DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, null, {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });

  it("should throw error when entites array has length 0", () => {
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, [], {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DB._resetAndDeleteAllData();
    assert.throws(() => {
      DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, [], {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: dropping data entity stores", () => {
  beforeEach(() => {
    DB._resetAndDeleteAllData();
    DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      env: "test",
      isTestMode: true,
    });
  });

  it("should delete created data storage file and remove respective key in entityFilesMap", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];

    assert.deepStrictEqual(
      DB.getEntityFilesMap(),
      getEntitiesMap(SAMPLE_ENTITIES, "test")
    );

    const filePath = `tests/data/test/${categoryEntity}.json`;
    const fileExistsInitial = fs.existsSync(filePath);

    assert.equal(fileExistsInitial, true);
    let error = null;
    let fileExistsFinal = true;
    try {
      DB.dropSync(categoryEntity);
      fileExistsFinal = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(fileExistsFinal, false); // file should be removed

    const FINAL_ENTITY_MAP = getEntitiesMap([SAMPLE_ENTITIES[1]], "test");
    assert.deepStrictEqual(DB.getEntityFilesMap(), FINAL_ENTITY_MAP);
  });

  it("should delete all created data storage file and set entityFilesMap to null", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    const commentsEntity = SAMPLE_ENTITIES[1];

    assert.deepStrictEqual(
      DB.getEntityFilesMap(),
      getEntitiesMap(SAMPLE_ENTITIES, "test")
    );

    const filePaths = [
      `tests/data/test/${categoryEntity}.json`,
      `tests/data/test/${commentsEntity}.json`,
    ];
    filePaths.forEach((f) => {
      const exists = fs.existsSync(f);
      assert.equal(exists, true);
    });

    let error = null;
    let filesRemoved = true;
    try {
      DB._dropAllSync();
      filePaths.forEach((f) => {
        const exists = fs.existsSync(f);
        if (exists) {
          filesRemoved = false;
        }
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(filesRemoved, true);
    assert.deepEqual(DB.getEntityFilesMap(), {});
  });
});

describe("Data Read Writer: Synchronized Data Writing", () => {
  before(() => {
    DB._resetAndDeleteAllData();
    DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DB._resetAndDeleteAllData();
  });

  it("should write data to file successfully", () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    // fs.existsSync path start from start of npm module
    const filePath = `tests/data/dev/${categoryEntity}.json`;
    let error = null;
    let fileExists = false;
    try {
      DB.saveSync(categoryEntity, { name: "sampleCategory" });
      // should create file in root/data/dev/category.json
      fileExists = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(fileExists, true);
    fs.unlinkSync(filePath);
  });

  it("should throw error when invalid entity is given", () => {
    const invalidEntity = "myInvalidEntity";
    const filePath = `tests/data/dev/${invalidEntity}.json`;
    let error = null;
    let fileExists = false;
    try {
      DB.saveSync(invalidEntity, { name: "sampleData" });
      fileExists = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      DB.saveSync(invalidEntity, { name: "sampleData" });
    });
    assert.notEqual(error, null);
    assert.equal(fileExists, false);
  });

  it("should throw error when invalid entity type is given", () => {
    const invalidEntity = 1234;
    const filePath = `tests/data/dev/${invalidEntity}.json`;
    let error = null;
    let fileExists = false;
    try {
      DB.saveSync(invalidEntity, { name: "sampleData" });
      fileExists = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      DB.saveSync(invalidEntity, { name: "sampleData" });
    });
    assert.notEqual(error, null);
    assert.equal(fileExists, false);
  });

  it("should throw error when DB was not initialized", () => {
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      DB.saveSync(sampleEntity, { name: "sampleData" });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      DB._resetAndDeleteAllData();
      DB.saveSync(sampleEntity, { name: "sampleData" });
    });
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Asynchronous Data Writing", () => {
  before(() => {
    DB._resetAndDeleteAllData();
    DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DB._resetAndDeleteAllData();
  });

  it("should write data to file successfully", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${categoryEntity}.json`;
    let error = null;
    let fileExists = false;
    try {
      await DB.saveAsync(categoryEntity, { name: "sampleCategory" });
      fileExists = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(fileExists, true);
    fs.unlinkSync(filePath);
  });

  it("should throw error when DB was not initialized", async () => {
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      await DB.saveAsync(sampleEntity, { name: "sampleData" });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Synchronized Data Reading", () => {
  before(() => {
    DB._resetAndDeleteAllData();
    DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DB._resetAndDeleteAllData();
  });

  it("should read data from file successfully", () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${categoryEntity}.json`;

    // write encrypted data first
    const sampleCategoryData = {
      name: "sampleCategory",
      description: "My sample category description",
    };
    let error = null;
    let readData;
    try {
      DB.saveSync(categoryEntity, sampleCategoryData);
      // attempt to read data
      readData = DB.readSync(categoryEntity);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(sampleCategoryData, readData);
    fs.unlinkSync(filePath);
  });

  it("should throw error when DB was not initialized", () => {
    let readData;
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      readData = DB.readSync(sampleEntity, { name: "sampleData" });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Asynchronous Data Reading", () => {
  before(() => {
    DB._resetAndDeleteAllData();
    DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DB._resetAndDeleteAllData();
  });

  it("should write data to file successfully", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${categoryEntity}.json`;

    // write encrypted data first
    const sampleCategoryData = {
      name: "sampleCategory",
      description: "My sample category description",
    };
    let error = null;
    let readData;
    try {
      DB.saveSync(categoryEntity, sampleCategoryData);
      // attempt to read data
      readData = await DB.readAsync(categoryEntity);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(sampleCategoryData, readData);
    fs.unlinkSync(filePath);
  });

  it("should throw error when DB was not initialized", async () => {
    let readData;
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DB._resetAndDeleteAllData();
      readData = await DB.readAsync(sampleEntity, { name: "sampleData" });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Reading and writing in different environments", () => {
  before(() => {
    DB._resetAndDeleteAllData();
    DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      env: "prod",
      isTestMode: true,
    });
  });

  after(() => {
    DB._resetAndDeleteAllData();
  });

  it("should write and read data successfully in prod environment", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/prod/${categoryEntity}.json`;
    // write encrypted data first
    const sampleCategoryData = {
      name: "sampleCategory",
      description: "My sample category description",
    };
    let error = null;
    let readData;
    let fileExists;
    try {
      DB.saveSync(categoryEntity, sampleCategoryData);
      fileExists = fs.existsSync(filePath);
      readData = await DB.readAsync(categoryEntity);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(fileExists, true);
    assert.deepStrictEqual(sampleCategoryData, readData);
    fs.unlinkSync(filePath);
  });
});
