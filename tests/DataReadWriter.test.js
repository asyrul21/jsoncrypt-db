const assert = require("assert");
const fs = require("fs");
const DataReadWriter = require("../DataReadWriter");

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
    DataReadWriter._resetAndDeleteAllData();
  });

  it("should instantiate successfully when all valid parameters are given", () => {
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(DataReadWriter, null);
    assert.equal(error, null);
    assert.deepEqual(
      DataReadWriter.getEntityFilesMap(),
      getEntitiesMap(SAMPLE_ENTITIES)
    );
  });

  it("should instantiate successfully when module has been initialized else where", () => {
    let error = null;
    try {
      DataReadWriter.initialize();
      DataReadWriter.initialize();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(DataReadWriter, null);
    assert.equal(error, null);
    assert.deepEqual(
      DataReadWriter.getEntityFilesMap(),
      getEntitiesMap(SAMPLE_ENTITIES)
    );
    assert.equal(DataReadWriter.isInitialized(), true);
  });

  it("should return map data successfully when module has been initialized else where", () => {
    assert.deepEqual(
      DataReadWriter.getEntityFilesMap(),
      getEntitiesMap(SAMPLE_ENTITIES)
    );
  });

  it("should throw error when crypto secret is missing", () => {
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      DataReadWriter.initialize(null, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DataReadWriter._resetAndDeleteAllData();
    assert.throws(() => {
      DataReadWriter.initialize(null, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });

  it("should throw error when vector secret is missing", () => {
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      DataReadWriter.initialize(SAMPLE_SECRET, null, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DataReadWriter._resetAndDeleteAllData();
    assert.throws(() => {
      DataReadWriter.initialize(SAMPLE_SECRET, null, SAMPLE_ENTITIES, {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });

  it("should throw error when entites array is missing", () => {
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, null, {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DataReadWriter._resetAndDeleteAllData();
    assert.throws(() => {
      DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, null, {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });

  it("should throw error when entites array has length 0", () => {
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, [], {
        isTestMode: true,
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    DataReadWriter._resetAndDeleteAllData();
    assert.throws(() => {
      DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, [], {
        isTestMode: true,
      });
    });
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: dropping data entity stores", () => {
  beforeEach(() => {
    DataReadWriter._resetAndDeleteAllData();
    DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      env: "test",
      isTestMode: true,
    });
  });

  it("should delete created data storage file and remove respective key in entityFilesMap", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];

    assert.deepStrictEqual(
      DataReadWriter.getEntityFilesMap(),
      getEntitiesMap(SAMPLE_ENTITIES, "test")
    );

    const filePath = `tests/data/test/${categoryEntity}.json`;
    const fileExistsInitial = fs.existsSync(filePath);

    assert.equal(fileExistsInitial, true);
    let error = null;
    let fileExistsFinal = true;
    try {
      DataReadWriter.dropSync(categoryEntity);
      fileExistsFinal = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(fileExistsFinal, false); // file should be removed

    const FINAL_ENTITY_MAP = getEntitiesMap([SAMPLE_ENTITIES[1]], "test");
    assert.deepStrictEqual(
      DataReadWriter.getEntityFilesMap(),
      FINAL_ENTITY_MAP
    );
  });

  it("should delete all created data storage file and set entityFilesMap to null", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    const commentsEntity = SAMPLE_ENTITIES[1];

    assert.deepStrictEqual(
      DataReadWriter.getEntityFilesMap(),
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
      DataReadWriter._dropAllSync();
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
    assert.deepEqual(DataReadWriter.getEntityFilesMap(), {});
  });
});

describe("Data Read Writer: Synchronized Data Writing", () => {
  before(() => {
    DataReadWriter._resetAndDeleteAllData();
    DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DataReadWriter._resetAndDeleteAllData();
  });

  it("should write data to file successfully", () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    // fs.existsSync path start from start of npm module
    const filePath = `tests/data/dev/${categoryEntity}.json`;
    let error = null;
    let fileExists = false;
    try {
      DataReadWriter.saveSync(categoryEntity, { name: "sampleCategory" });
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
      DataReadWriter.saveSync(invalidEntity, { name: "sampleData" });
      fileExists = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      DataReadWriter.saveSync(invalidEntity, { name: "sampleData" });
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
      DataReadWriter.saveSync(invalidEntity, { name: "sampleData" });
      fileExists = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      DataReadWriter.saveSync(invalidEntity, { name: "sampleData" });
    });
    assert.notEqual(error, null);
    assert.equal(fileExists, false);
  });

  it("should throw error when DataReadWriter was not initialized", () => {
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      DataReadWriter.saveSync(sampleEntity, { name: "sampleData" });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.throws(() => {
      DataReadWriter._resetAndDeleteAllData();
      DataReadWriter.saveSync(sampleEntity, { name: "sampleData" });
    });
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Asynchronous Data Writing", () => {
  before(() => {
    DataReadWriter._resetAndDeleteAllData();
    DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DataReadWriter._resetAndDeleteAllData();
  });

  it("should write data to file successfully", async () => {
    const categoryEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${categoryEntity}.json`;
    let error = null;
    let fileExists = false;
    try {
      await DataReadWriter.saveAsync(categoryEntity, {
        name: "sampleCategory",
      });
      fileExists = fs.existsSync(filePath);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(fileExists, true);
    fs.unlinkSync(filePath);
  });

  it("should throw error when DataReadWriter was not initialized", async () => {
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      await DataReadWriter.saveAsync(sampleEntity, { name: "sampleData" });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Synchronized Data Reading", () => {
  before(() => {
    DataReadWriter._resetAndDeleteAllData();
    DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DataReadWriter._resetAndDeleteAllData();
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
      DataReadWriter.saveSync(categoryEntity, sampleCategoryData);
      // attempt to read data
      readData = DataReadWriter.readSync(categoryEntity);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(sampleCategoryData, readData);
    fs.unlinkSync(filePath);
  });

  it("should throw error when DataReadWriter was not initialized", () => {
    let readData;
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      readData = DataReadWriter.readSync(sampleEntity, { name: "sampleData" });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Asynchronous Data Reading", () => {
  before(() => {
    DataReadWriter._resetAndDeleteAllData();
    DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      isTestMode: true,
    });
  });

  after(() => {
    DataReadWriter._resetAndDeleteAllData();
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
      DataReadWriter.saveSync(categoryEntity, sampleCategoryData);
      // attempt to read data
      readData = await DataReadWriter.readAsync(categoryEntity);
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(sampleCategoryData, readData);
    fs.unlinkSync(filePath);
  });

  it("should throw error when DataReadWriter was not initialized", async () => {
    let readData;
    const sampleEntity = SAMPLE_ENTITIES[0];
    const filePath = `tests/data/dev/${sampleEntity}.json`;
    let error = null;
    try {
      DataReadWriter._resetAndDeleteAllData();
      readData = await DataReadWriter.readAsync(sampleEntity, {
        name: "sampleData",
      });
    } catch (e) {
      console.log(`ERROR: ${e.message || e}`);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Data Read Writer: Reading and writing in different environments", () => {
  before(() => {
    DataReadWriter._resetAndDeleteAllData();
    DataReadWriter.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, {
      env: "prod",
      isTestMode: true,
    });
  });

  after(() => {
    DataReadWriter._resetAndDeleteAllData();
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
      DataReadWriter.saveSync(categoryEntity, sampleCategoryData);
      fileExists = fs.existsSync(filePath);
      readData = await DataReadWriter.readAsync(categoryEntity);
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
