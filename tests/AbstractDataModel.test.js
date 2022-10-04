const { DB, AbstractDataModel } = require("../");

const SAMPLE_SECRET = "sampleSecret";
const SAMPLE_VECTOR = "sampleVector";
const SAMPLE_ENTITIES = ["categories", "comments"];
const SAMPLE_DATA = [
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

DB._reset();
DB.initialize(SAMPLE_SECRET, SAMPLE_VECTOR, SAMPLE_ENTITIES, "test", true);

class Category extends AbstractDataModel {
  id;
  name;
  description;

  constructor(id, name, description) {
    super(DB);
    this.id = id;
    this.name = name;
    this.description = description;
  }

  entityPluralName() {
    return "categories";
  }

  identifier() {
    return "id";
  }

  getDataObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
    };
  }
}

describe("Abstract Data Model Implementation: Creating Data", () => {
  const CATEGORIES_ENTITY = SAMPLE_ENTITIES[0];
  beforeEach(() => {
    // DB.dropSync(CATEGORIES_ENTITY);
    // DB.saveAsync(CATEGORIES_ENTITY, []);
  });

  it("should create and save a single category object", async () => {
    const sampleCategory = SAMPLE_DATA[0];
    const myNewCategory = new Category(
      sampleCategory.id,
      sampleCategory.name,
      sampleCategory.description
    );

    const updatedArray = await myNewCategory.createNew();
    console.log(updatedArray);
  });
});
