const assert = require("assert");
const fs = require("fs");
const DB = require("../DB");
const DataReadWriter = require("../DataReadWriter");

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
    name: "category 2",
    description: "sample category 2 description",
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

describe("DB: Creating and Saving Data", () => {
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
    // console.log(data);
    assert.equal(error, null);
    assert.deepStrictEqual(data, [sampleData]);
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
    assert.deepStrictEqual(inMemoryData, SAMPLE_CATEGORIES_DATA);
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
    // console.log(forceFetchedData);
    assert.equal(error, null);
    assert.deepStrictEqual(forceFetchedData, SAMPLE_CATEGORIES_DATA);
    assert.deepStrictEqual(forceFetchedData, inMemoryData);
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
    assert.deepStrictEqual(forceFetchedCategoriesData, SAMPLE_CATEGORIES_DATA);
    assert.deepStrictEqual(forceFetchedCategoriesData, inMemoryCategoriesData);

    assert.deepStrictEqual(forceFetchedCommentsData, SAMPLE_COMMENTS_DATA);
    assert.deepStrictEqual(forceFetchedCommentsData, inMemoryCommentsData);
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
    assert.deepStrictEqual(forceFetchedData, SAMPLE_CATEGORIES_DATA);
    assert.deepStrictEqual(forceFetchedData, inMemoryData);
    DB._resetDBAndDeleteAllData();
  });

  it("should replace all data and save them for an entity successfully", async () => {
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
    assert.deepStrictEqual(forceFetchedData, SAMPLE_CATEGORIES_DATA);
    assert.deepStrictEqual(forceFetchedData, inMemoryData);

    const REPLACED_DATA = [
      {
        name: "The replaced category",
        author: "john",
      },
    ];

    try {
      inMemoryData = await DB.replaceAllDataFor(
        DB.getEntities().categories,
        REPLACED_DATA
      );
      await DB.saveFor(DB.getEntities().categories);
      forceFetchedData = await DB.findAllFor(DB.getEntities().categories, true);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(inMemoryData, REPLACED_DATA);
    assert.deepStrictEqual(forceFetchedData, REPLACED_DATA);

    DB._resetDBAndDeleteAllData();
  });
});
