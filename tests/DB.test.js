const assert = require("assert");
const fs = require("fs");
const path = require("path");
const DB = require("../DB");

const BUFFER_ENCODING = "utf-8";
const SAMPLE_SECRET = "sampleSecret";
const SAMPLE_VECTOR = "sampleVector";
const SAMPLE_ENTITIES = {
  categories: "categories",
  comments: "comments",
};
const SAMPLE_CATEGORIES_DATA = [
  {
    id: "123",
    name: "category 1",
    description: "sample category 1 description",
  },
  {
    id: "456",
    name: "category 2",
    description: "sample category 2 description",
  },
  {
    id: "789",
    name: "category 3",
    description: "sample category 3 description",
  },
];

const SAMPLE_COMMENTS_DATA = [
  {
    id: "123",
    comment: "category 1",
    author: "John",
  },
  {
    id: "456",
    comment: "category 2",
    author: "Ali",
  },
];

const transformDataArrayWithMockDates = (dataArr) => {
  return dataArr.map((d) => {
    return {
      ...d,
      createdAt: new Date(2020, 0, 2),
      updatedAt: new Date(2020, 0, 2),
    };
  });
};

const transformDataObjectWithMockDates = (dataObj) => {
  return {
    ...dataObj,
    createdAt: new Date(2020, 0, 2),
    updatedAt: new Date(2020, 0, 2),
  };
};

const transformEntireDBWithMockDates = (dataMap) => {
  let result = {};
  Object.keys(dataMap).forEach((e) => {
    result[e] = transformDataArrayWithMockDates(dataMap[e]);
  });
  return result;
};

describe("DB: Registering entities", () => {
  afterEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should register new entities if not exist successfully", () => {
    let error = null;
    try {
      DB.registerEntity(SAMPLE_ENTITIES.categories);
      DB.registerEntity(SAMPLE_ENTITIES.comments);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepEqual(DB.getEntities(), SAMPLE_ENTITIES);
  });

  it("should not register new entities if already exists", () => {
    let error = null;
    try {
      DB.registerEntity(SAMPLE_ENTITIES.categories);
      DB.registerEntity(SAMPLE_ENTITIES.comments);
      DB.registerEntity(SAMPLE_ENTITIES.comments);
      DB.registerEntity(SAMPLE_ENTITIES.comments);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepEqual(DB.getEntities(), SAMPLE_ENTITIES);
  });

  it("should throw error if trying to register of non-string entity", () => {
    let error = null;
    try {
      DB.registerEntity({ name: "John" });
    } catch (e) {
      console.log("ERROR:", e.message);
      error = e;
    }
    assert.notEqual(error, null);
    assert.throws(() => {
      DB.removeEntityAndDeleteEntityData("Johny");
    });
  });
});

describe("DB: Removing entities", () => {
  afterEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should remove entity exists successfully", () => {
    let error = null;
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);

    try {
      DB.removeEntityAndDeleteEntityData(DB.getEntities().categories);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepEqual(DB.getEntities(), { comments: "comments" });
  });

  it("should throw error if trying to remove non-existent entity", () => {
    let error = null;
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    try {
      DB.removeEntityAndDeleteEntityData("Johny");
    } catch (e) {
      console.log("ERROR:", e.message);
      error = e;
    }
    assert.notEqual(error, null);
    assert.throws(() => {
      DB.removeEntityAndDeleteEntityData("Johny");
    });
  });
});

describe("DB: Building", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should throw error if trying to build without registering entities", () => {
    let error = null;
    try {
      DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    } catch (e) {
      console.log("ERROR:", e.message);
      error = e;
    }
    assert.notEqual(error, null);
    assert.throws(() => {
      DB.removeEntityAndDeleteEntityData("Johny");
    });
  });

  it("should build successfully", () => {
    let error = null;
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    try {
      DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(DB.isUp(), true);
    DB._resetDBAndDeleteAllData();
  });

  it("should remove data files after deleting entity after building", () => {
    let error = null;
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    // this should create two new files
    const filePathCategories = `tests/data/test/${SAMPLE_ENTITIES.categories}.json`;
    const filePathComments = `tests/data/test/${SAMPLE_ENTITIES.comments}.json`;

    assert.equal(fs.existsSync(filePathCategories), true);
    assert.equal(fs.existsSync(filePathComments), true);

    try {
      DB.removeEntityAndDeleteEntityData(SAMPLE_ENTITIES.categories);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.equal(fs.existsSync(filePathCategories), false); // categories should be deleted
    assert.equal(fs.existsSync(filePathComments), true);
    DB._resetDBAndDeleteAllData();
  });

  it("should build successfully and able to read empty file", async () => {
    let error = null;
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    let data;
    try {
      DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
      data = await DB.findAllFor(DB.getEntities().categories);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepEqual(data, []);
    DB._resetDBAndDeleteAllData();
  });
});

describe("DB: Creating, findAllFor, and Saving Data", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should create new data successfully", async () => {
    let error = null;
    let data;
    const sampleData = SAMPLE_CATEGORIES_DATA[0];
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    try {
      data = await DB.createNewFor(DB.getEntities().categories, sampleData);
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(transformDataArrayWithMockDates(data), [
      transformDataObjectWithMockDates(sampleData),
    ]);
    DB._resetDBAndDeleteAllData();
  });

  it("should not be saved to database files if client did not call saveFor()", async () => {
    let error = null;
    let forceFetchedData;
    let inMemoryData;
    const sampleData1 = SAMPLE_CATEGORIES_DATA[0];
    const sampleData2 = SAMPLE_CATEGORIES_DATA[1];
    const sampleData3 = SAMPLE_CATEGORIES_DATA[2];

    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });

    try {
      await DB.createNewFor(DB.getEntities().categories, sampleData1);
      await DB.createNewFor(DB.getEntities().categories, sampleData2);
      inMemoryData = await DB.createNewFor(
        DB.getEntities().categories,
        sampleData3
      );

      forceFetchedData = await DB.findAllFor(DB.getEntities().categories, true);
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(forceFetchedData, []); // should still be empty
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(inMemoryData),
      transformDataArrayWithMockDates(SAMPLE_CATEGORIES_DATA)
    );
    DB._resetDBAndDeleteAllData();
  });

  it("should create and save data for entity successfully", async () => {
    let error = null;
    let forceFetchedData;
    let inMemoryData;
    const sampleData1 = SAMPLE_CATEGORIES_DATA[0];
    const sampleData2 = SAMPLE_CATEGORIES_DATA[1];
    const sampleData3 = SAMPLE_CATEGORIES_DATA[2];

    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });

    try {
      await DB.createNewFor(DB.getEntities().categories, sampleData1);
      await DB.createNewFor(DB.getEntities().categories, sampleData2);
      inMemoryData = await DB.createNewFor(
        DB.getEntities().categories,
        sampleData3
      );

      // save
      await DB.saveFor(DB.getEntities().categories);
      forceFetchedData = await DB.findAllFor(DB.getEntities().categories, true);
    } catch (e) {
      console.log(e);
      error = e;
    }
    // console.log("forcedFetched");
    // console.log(forceFetchedData);
    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(SAMPLE_CATEGORIES_DATA)
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(inMemoryData)
    );
    DB._resetDBAndDeleteAllData();
  });

  it("should create and save data for all entities successfully", async () => {
    let error = null;
    let forceFetchedCategoriesData;
    let forceFetchedCommentsData;
    let inMemoryCategoriesData;
    let inMemoryCommentsData;

    const sampleCatData1 = SAMPLE_CATEGORIES_DATA[0];
    const sampleCatData2 = SAMPLE_CATEGORIES_DATA[1];
    const sampleCatData3 = SAMPLE_CATEGORIES_DATA[2];

    const sampleCommentsData1 = SAMPLE_COMMENTS_DATA[0];
    const sampleCommentsData2 = SAMPLE_COMMENTS_DATA[1];

    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });

    try {
      await DB.createNewFor(DB.getEntities().categories, sampleCatData1);
      await DB.createNewFor(DB.getEntities().categories, sampleCatData2);
      inMemoryCategoriesData = await DB.createNewFor(
        DB.getEntities().categories,
        sampleCatData3
      );

      await DB.createNewFor(DB.getEntities().comments, sampleCommentsData1);
      inMemoryCommentsData = await DB.createNewFor(
        DB.getEntities().comments,
        sampleCommentsData2
      );

      // save all
      await DB.saveAll();
      forceFetchedCategoriesData = await DB.findAllFor(
        DB.getEntities().categories,
        true
      );
      forceFetchedCommentsData = await DB.findAllFor(
        DB.getEntities().comments,
        true
      );
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedCategoriesData),
      transformDataArrayWithMockDates(SAMPLE_CATEGORIES_DATA)
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedCategoriesData),
      transformDataArrayWithMockDates(inMemoryCategoriesData)
    );

    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedCommentsData),
      transformDataArrayWithMockDates(SAMPLE_COMMENTS_DATA)
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedCommentsData),
      transformDataArrayWithMockDates(inMemoryCommentsData)
    );
    DB._resetDBAndDeleteAllData();
  });

  it("should create many and save them for an entity successfully", async () => {
    let error = null;
    let forceFetchedData;
    let inMemoryData;

    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });

    try {
      inMemoryData = await DB.createManyNewFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA
      );

      await DB.saveFor(DB.getEntities().categories);
      forceFetchedData = await DB.findAllFor(DB.getEntities().categories, true);
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(SAMPLE_CATEGORIES_DATA)
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(inMemoryData)
    );
    DB._resetDBAndDeleteAllData();
  });
});

describe("DB: Retrieving and Saving Data", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should retrieve data by identifier successfully", async () => {
    let error = null;
    let result = null;
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    try {
      await DB.createManyNewFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA
      );
      await DB.saveFor(DB.getEntities().categories);

      // retrieve
      result = await DB.findByIdentifierFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA[2].id
      );
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataObjectWithMockDates(result),
      transformDataObjectWithMockDates(SAMPLE_CATEGORIES_DATA[2])
    );
    DB._resetDBAndDeleteAllData();
  });

  it("should retrieve data by filter function successfully", async () => {
    let error = null;
    let result = null;
    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    try {
      await DB.createManyNewFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA
      );
      await DB.saveFor(DB.getEntities().categories);

      // retrieve
      result = await DB.findByFilterCallbackFor(
        DB.getEntities().categories,
        (obj) => {
          return obj.name === "category 2";
        }
      );
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataObjectWithMockDates(result[0]),
      transformDataObjectWithMockDates(SAMPLE_CATEGORIES_DATA[1])
    );
    DB._resetDBAndDeleteAllData();
  });
});

describe("DB: Updating and Saving Data", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should update and save data for entity successfully", async () => {
    let error = null;
    let forceFetchedData;
    let inMemoryData;

    let sampleData1 = { ...SAMPLE_CATEGORIES_DATA[0] };
    sampleData1.name = "Updated Category Name";
    sampleData1.description = "This category has been updated";

    const UPDATED_SAMPLE_DATA = [
      { ...sampleData1 },
      { ...SAMPLE_CATEGORIES_DATA[1] },
      { ...SAMPLE_CATEGORIES_DATA[2] },
    ];

    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });

    try {
      await DB.createManyNewFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA
      );
      await DB.saveFor(DB.getEntities().categories);

      inMemoryData = await DB.updateFor(
        DB.getEntities().categories,
        sampleData1.id,
        sampleData1
      );
      await DB.saveFor(DB.getEntities().categories);

      forceFetchedData = await DB.findAllFor(DB.getEntities().categories, true);
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(UPDATED_SAMPLE_DATA)
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(inMemoryData)
    );
    DB._resetDBAndDeleteAllData();
  });
});

describe("DB: Deleting and Saving Data", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should update and save data for entity successfully", async () => {
    let error = null;
    let forceFetchedData;
    let inMemoryData;

    const UPDATED_SAMPLE_DATA = [
      { ...SAMPLE_CATEGORIES_DATA[0] },
      { ...SAMPLE_CATEGORIES_DATA[2] },
    ];

    DB.registerEntity(SAMPLE_ENTITIES.categories);
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });

    try {
      await DB.createManyNewFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA
      );
      await DB.saveFor(DB.getEntities().categories);

      inMemoryData = await DB.deleteFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA[1].id
      );
      await DB.saveFor(DB.getEntities().categories);

      forceFetchedData = await DB.findAllFor(DB.getEntities().categories, true);
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(UPDATED_SAMPLE_DATA)
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(inMemoryData)
    );
    DB._resetDBAndDeleteAllData();
  });
});

describe("DB: Entity Option Hooks", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  it("should fail validation when hook:validateOnCreate is used", async () => {
    let validateFalseError = null;

    DB.registerEntity(SAMPLE_ENTITIES.categories, {
      validateOnCreate: (dataObj) => {
        return false;
      },
    });
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    try {
      // should throw error
      await DB.createNewFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA[0]
      );
    } catch (e) {
      console.log(e.message || e);
      validateFalseError = e;
    }
    assert.notEqual(validateFalseError, null);
  });

  it("should utilise hook:validateOnCreate and pass validation to create data successfully", async () => {
    const sampleData = SAMPLE_CATEGORIES_DATA[0];
    // validate should pass
    let inMemoryData;
    let validateTrueError = null;
    let forceFetchedData;

    DB.registerEntity(SAMPLE_ENTITIES.categories, {
      validateOnCreate: (dataObj) => {
        return true;
      },
    });
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    try {
      inMemoryData = await DB.createNewFor(
        DB.getEntities().categories,
        sampleData
      );
      // save
      await DB.saveFor(DB.getEntities().categories);
      forceFetchedData = await DB.findAllFor(DB.getEntities().categories, true);
    } catch (e) {
      console.log(e);
      validateTrueError = e;
    }

    assert.equal(validateTrueError, null);
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates([sampleData])
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forceFetchedData),
      transformDataArrayWithMockDates(inMemoryData)
    );
  });

  it("should retrieve data by identifier successfully when using hook:identifierKey", async () => {
    const SAMPLE_CATEGORIES_DATA_ALT = [
      {
        key: "123",
        name: "category 1",
        description: "sample category 1 description",
      },
      {
        key: "456",
        name: "category 2",
        description: "sample category 2 description",
      },
      {
        key: "789",
        name: "category 2",
        description: "sample category 2 description",
      },
    ];

    let error = null;
    let result = null;
    let inMemory;
    let forcedFetchedData;
    DB.registerEntity(SAMPLE_ENTITIES.categories, {
      identifierKey: "key",
    });
    DB.registerEntity(SAMPLE_ENTITIES.comments);
    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    try {
      inMemory = await DB.createManyNewFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA_ALT
      );
      await DB.saveFor(DB.getEntities().categories);

      // retrieve
      result = await DB.findByIdentifierFor(
        DB.getEntities().categories,
        SAMPLE_CATEGORIES_DATA_ALT[2].key
      );
      forcedFetchedData = await DB.findAllFor(
        DB.getEntities().categories,
        true
      );
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataObjectWithMockDates(result),
      transformDataObjectWithMockDates(SAMPLE_CATEGORIES_DATA_ALT[2])
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forcedFetchedData),
      transformDataArrayWithMockDates(inMemory)
    );
    DB._resetDBAndDeleteAllData();
  });

  it("should transform data successfully when using hook:preSaveTransform", async () => {
    const SAMPLE_NEW_USER = {
      id: "123",
      username: "John Marston",
      password: "myTestPassword",
    };

    const mockEncryptPassword = (p) => {
      return `abcdef-${p}-abcdef`;
    };

    const expectedTransformed = {
      id: "123",
      username: "John Marston",
      password: "abcdef-myTestPassword-abcdef",
    };

    let error = null;
    let result = null;
    let inMemory;
    let forcedFetchedData;
    DB.registerEntity("users", {
      preSaveTransform: (dataObj) => {
        return {
          ...dataObj,
          password: mockEncryptPassword(dataObj.password),
        };
      },
    });

    DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, { env: "test", isTestMode: true });
    try {
      inMemory = await DB.createNewFor(DB.getEntities().users, SAMPLE_NEW_USER);
      await DB.saveFor(DB.getEntities().users);

      // retrieve
      result = await DB.findByIdentifierFor(DB.getEntities().users, "123");
      forcedFetchedData = await DB.findAllFor(DB.getEntities().users, true);
    } catch (e) {
      console.log(e);
      error = e;
    }

    assert.equal(error, null);
    assert.deepStrictEqual(
      transformDataObjectWithMockDates(result),
      transformDataObjectWithMockDates(expectedTransformed)
    );
    assert.deepStrictEqual(
      transformDataArrayWithMockDates(forcedFetchedData),
      transformDataArrayWithMockDates(inMemory)
    );
    DB._resetDBAndDeleteAllData();
  });
});

describe("DB: Importing", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  describe("Import by Entity", () => {
    const SAMPLE_EXPECTED = [
      {
        id: "4321",
        name: "Personal Development & Productivity",
      },
      {
        id: "5432",
        name: "Sports",
      },
    ];

    it("should import data by entity and save during build", async () => {
      let error = null;
      let inMemory;
      let forcedFetchedData;

      try {
        DB.registerEntity(SAMPLE_ENTITIES.categories);
        // add data import path
        DB.importJSONFileForEntity(
          "categories",
          "tests/sampleImportData/categories.json"
        );
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });

        inMemory = await DB.findAllFor(DB.getEntities().categories);
        forcedFetchedData = await DB.findAllFor(
          DB.getEntities().categories,
          true
        );
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.equal(error, null);
      assert.deepStrictEqual(
        transformDataArrayWithMockDates(inMemory),
        transformDataArrayWithMockDates(SAMPLE_EXPECTED)
      );
      assert.deepStrictEqual(
        transformDataArrayWithMockDates(forcedFetchedData),
        transformDataArrayWithMockDates(SAMPLE_EXPECTED)
      );
      assert.deepStrictEqual(
        transformDataArrayWithMockDates(forcedFetchedData),
        transformDataArrayWithMockDates(inMemory)
      );
    });

    it("should throw error if imported data structure is invalid.", async () => {
      let error = null;
      try {
        DB.registerEntity(SAMPLE_ENTITIES.categories);
        DB.importJSONFileForEntity(
          "categories",
          "tests/sampleImportData/invalid.json"
        );
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });
      } catch (e) {
        console.log(e);
        error = e;
      }

      assert.notEqual(error, null);
    });

    it("should throw error if csv file is provided.", async () => {
      let error = null;
      try {
        DB.registerEntity(SAMPLE_ENTITIES.categories);
        DB.importJSONFileForEntity(
          "categories",
          "tests/sampleImportData/csvTest.csv"
        );
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.notEqual(error, null);
    });

    it("should throw error if entireDBImportData prop is populated", async () => {
      let error = null;
      try {
        DB.registerEntity(SAMPLE_ENTITIES.categories);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.importJSONFileForEntity(
          "categories",
          "tests/sampleImportData/invalid.json"
        );
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.notEqual(error, null);
    });
  });

  describe("Import by Entire Database", () => {
    const EXTENDED_ENTITES = {
      ...SAMPLE_ENTITIES,
      users: "users",
    };

    const SAMPLE_EXPECTED = {
      users: [
        {
          id: "12345",
          username: "Ahmad",
          password: "1234",
        },
      ],
      categories: [
        {
          id: "4321",
          name: "Personal Development & Productivity",
        },
        {
          id: "5432",
          name: "Sports",
        },
      ],
      comments: [
        {
          id: "4567",
          comment: "Awesome!",
          author: "John Wick",
        },
      ],
    };

    it("should import entire database data and save during build", async () => {
      let error = null;
      let inMemory;
      let forcedFetchedCategories;
      let forcedFetchedUsers;
      let forcedFetchedComments;

      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });

        inMemory = DB.getEntireDatabase();
        forcedFetchedCategories = await DB.findAllFor(
          DB.getEntities().categories,
          true
        );
        forcedFetchedUsers = await DB.findAllFor(DB.getEntities().users, true);
        forcedFetchedComments = await DB.findAllFor(
          DB.getEntities().comments,
          true
        );
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.equal(error, null);
      assert.deepStrictEqual(
        transformEntireDBWithMockDates(inMemory),
        transformEntireDBWithMockDates(SAMPLE_EXPECTED)
      );
      assert.deepStrictEqual(
        transformDataArrayWithMockDates(forcedFetchedCategories),
        transformDataArrayWithMockDates(SAMPLE_EXPECTED.categories)
      );
      assert.deepStrictEqual(
        transformDataArrayWithMockDates(forcedFetchedUsers),
        transformDataArrayWithMockDates(SAMPLE_EXPECTED.users)
      );
      assert.deepStrictEqual(
        transformDataArrayWithMockDates(forcedFetchedComments),
        transformDataArrayWithMockDates(SAMPLE_EXPECTED.comments)
      );
    });

    it("should throw error if imported data structure is invalid.", async () => {
      let error = null;
      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/invalid.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.notEqual(error, null);
    });

    it("should throw error if entityImportData prop is populated", async () => {
      let error = null;
      try {
        DB.registerEntity(SAMPLE_ENTITIES.categories);
        DB.importJSONFileForEntity(
          "categories",
          "tests/sampleImportData/invalid.json"
        );
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.notEqual(error, null);
    });
  });
});

describe("DB: Exporting", () => {
  beforeEach(() => {
    DB._resetDBAndDeleteAllData();
  });

  const EXTENDED_ENTITES = {
    ...SAMPLE_ENTITIES,
    users: "users",
  };

  const SAMPLE_EXPECTED = [
    {
      id: "4321",
      name: "Personal Development & Productivity",
    },
    {
      id: "5432",
      name: "Sports",
    },
  ];

  describe("Export data by Entity", () => {
    it("should export data to file by entity, with only folderPath given", async () => {
      let error = null;
      let data;
      const testExportDir = "tests/data/test/backup";
      const defaultFileName = `db_export_categories.json`;

      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });

        // export entity data
        DB.exportDataToJSONForEntity(
          DB.getEntities().categories,
          testExportDir
        );

        const dataStr = fs.readFileSync(`${testExportDir}/${defaultFileName}`, {
          encoding: BUFFER_ENCODING,
        });
        data = JSON.parse(dataStr);
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.equal(error, null);
      assert.deepStrictEqual(data, SAMPLE_EXPECTED);
      fs.unlinkSync(`${testExportDir}/${defaultFileName}`);
      fs.rmSync(testExportDir, { recursive: true, force: true });
    });

    it("should export data to file by entity, with folderPath and filename given", async () => {
      let error = null;
      let data;
      const testExportDir = "tests/data/test/backup/";
      const customName = `my_categories_export`;
      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });

        // export entity data
        DB.exportDataToJSONForEntity(
          DB.getEntities().categories,
          testExportDir,
          customName
        );

        // should append .json implicitly
        const dataStr = fs.readFileSync(
          `${path.resolve(testExportDir, customName)}.json`,
          {
            encoding: BUFFER_ENCODING,
          }
        );
        data = JSON.parse(dataStr);
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.equal(error, null);
      assert.deepStrictEqual(data, SAMPLE_EXPECTED);
      fs.unlinkSync(`${path.resolve(testExportDir, customName)}.json`);
      fs.rmSync(testExportDir, { recursive: true, force: true });
    });

    it("should throw file write errors and undo directory creation when filename of invalid extension is provided", async () => {
      let error = null;
      const testExportDir = "tests/data/test/backup";
      const customName = `db_export_categories.pdf`;
      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });
        // export entity data
        DB.exportDataToJSONForEntity(
          DB.getEntities().categories,
          testExportDir,
          customName
        );
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.notEqual(error, null);
      const folderExists = fs.existsSync(testExportDir);
      assert.equal(folderExists, false);
    });
  });

  describe("Import by Entire Database", () => {
    const EXTENDED_ENTITES = {
      ...SAMPLE_ENTITIES,
      users: "users",
    };

    const SAMPLE_EXPECTED = {
      users: [
        {
          id: "12345",
          username: "Ahmad",
          password: "1234",
        },
      ],
      categories: [
        {
          id: "4321",
          name: "Personal Development & Productivity",
        },
        {
          id: "5432",
          name: "Sports",
        },
      ],
      comments: [
        {
          id: "4567",
          comment: "Awesome!",
          author: "John Wick",
        },
      ],
    };

    it("should export entire database data to file when only folder path is provided", async () => {
      let error = null;
      let data;
      const testExportDir = "tests/data/test/backup/";
      const defaultFileName = `db_export_all.json`;

      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });

        // export entity data
        DB.exportEntireDatabaseToJSON(testExportDir, defaultFileName);

        const dataStr = fs.readFileSync(`${testExportDir}/${defaultFileName}`, {
          encoding: BUFFER_ENCODING,
        });
        data = JSON.parse(dataStr);
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.equal(error, null);
      assert.deepStrictEqual(data, SAMPLE_EXPECTED);
      fs.unlinkSync(`${testExportDir}/${defaultFileName}`);
      fs.rmSync(testExportDir, { recursive: true, force: true });
    });

    it("should export entire database data to file when folder path and custom file name is provided", async () => {
      let error = null;
      let data;
      const testExportDir = "tests/data/test/backup/";
      const customName = `my_entire_db_export`;

      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });

        // export entity data
        DB.exportEntireDatabaseToJSON(testExportDir, customName);
        // should append .json implicitly
        const dataStr = fs.readFileSync(
          `${path.resolve(testExportDir, customName)}.json`,
          {
            encoding: BUFFER_ENCODING,
          }
        );
        data = JSON.parse(dataStr);
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.equal(error, null);
      assert.deepStrictEqual(data, SAMPLE_EXPECTED);
      fs.unlinkSync(`${path.resolve(testExportDir, customName)}.json`);
      fs.rmSync(testExportDir, { recursive: true, force: true });
    });

    it("should throw file write error and undo folder creation when invalid file extension is requested", async () => {
      let error = null;
      const testExportDir = "tests/data/test/backup/";
      const customName = `db_export_all.pdf`;
      try {
        DB.registerEntity(EXTENDED_ENTITES.users);
        DB.registerEntity(EXTENDED_ENTITES.categories);
        DB.registerEntity(EXTENDED_ENTITES.comments);
        DB.importJSONFileForEntireDB("tests/sampleImportData/entireDB.json");
        DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
          env: "test",
          isTestMode: true,
        });
        // export entity data
        DB.exportEntireDatabaseToJSON(testExportDir, customName);
      } catch (e) {
        console.log(e);
        error = e;
      }
      assert.notEqual(error, null);
      const folderExists = fs.existsSync(testExportDir);
      assert.equal(folderExists, false);
    });
  });
});

after(() => {
  DB._resetDBAndDeleteAllData();
  fs.rmSync("tests/data/dev", { recursive: true, force: true });
  fs.rmSync("tests/data/prod", { recursive: true, force: true });
  fs.rmSync("tests/data/test", { recursive: true, force: true });
});
