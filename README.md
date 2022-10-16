# Simple DB fro Node JS

This module presents a simple, serverless, encrypted, and deploy-ready data storage for Node JS. It stores essentially JSON data, but they are encrypted, hence enabling clients to push and pull relatively sensitive data (such as your name, address, where you studied, where you work etc.) to source control platforms such as git. That being said, do NOT use this module if your app stores critically sensitive data, such as Credit Card information and governmental idenfication information.

It has only 1 dependency, and allows clients to implement deploy-ready data persistent application without having to think about what database to use (mongo/my-sql/sql server/oracle db etc.), where, and how to deploy them. It resides just next to your server application (nodeJS).

This data store module fits well if your app:

1. is written in NodeJS

2. is relatively simple and does not need Availability features such as cross-region duplication, sharding, etc.

3. Hypothetically will not store very huge amount of data

4. Do not need automatic/scheduled backup

5. Does not work with critical / sensitive data such as Credit Card information and governmental idenfication information.

> IMPORTANT: This module does not support automatic data backup, and all data will be wiped upon re-deploy. To keep your data, you would have to manually export existing entity data or entire database as a JSON file, then import that file upon your next deploy session (See Advanced Setup section below).

# Basic Setup

The two basic steps:

## 1. Registering Your Entities

Method: `DB.registerEntity(entityName, options)`

Arguments:

- _entityName_ : must be a string of a SINGLE PLURAL WORD. eg. "categories"

- _options_ : So far this has three keys you can override:

  - _identifierKey_ : The primary key field of your entity. Default is "id"

  - _validateOnCreate_ : (Hook) A function you can provide to perform validations new data for that entity is added/created. Default is a function that returns `true`.

  - _preSaveTransform_ : (Hook) A function you can provide to perform transformations of data objects for that entity before it is created/updated in the data store. This is useful if you want to perform password encryption for user entity, before it is being created/updated. Default is a function that returns the entity data object itself.

> After registering your entities, you can now access them with the method `DB.getEntities()`. This helps to avoid spelling mistakes when using the module.

## 2. Build Your Database

The library encrypts your data before writing into the database, hence require two secret keys, the _encryptionSecret_, and the _initialVectorSecret_. Both of these values SHOULD BE STORED in environment variables.

Method: `DB.build(encryptionSecret, initialVectorSecret, options)`

Arguments:

- _encryptionSecret_ : must be a string of a secret phrases. eg. "mySecretPhrase". This value should be stored in .env/environment variables.

- _initialVectorSecret_ : must be a string of a secret phrases. eg. "myAnotherSecretPhrase". This value should be stored in .env/environment variables

- _options_ : So far there are two keys you can override:

  - _env_ : The environment which the DB is running in. Default value is "dev", but you should reference the variable stored in your .env / environment variables.

  - _isTestMode_ : This option is only for unit test purposes, and clients should avoid overriding it.

## Example:

```javascript
// import
const DB = require("simple-db");

// 1. register your entities - it should be a string of ONE plural word
DB.registerEntity("categories");
DB.registerEntity("comments", {
  identifierKey: "key", // default is "id"
  validateOnCreate: (dataObj) => {
    return true;
  },
  preSaveTransform: (dataObj) => {
    return { ...dataObj };
  },
});

/* You can now reference your categories with DB.getCategories()
 *  Eg. DB.getEntities().categories
 *  Eg. DB.getEntities().comments
 */

// these are usually stored in .env / environment variables
const SAMPLE_SECRET = "sampleSecret";
const VECTOR_SECRET = "vectorSecret";

// 2. build
DB.build(SAMPLE_SECRET, VECTOR_SECRET, {
  env: "dev",
});
```

# Advanced Setup

## 1. Importing Data from JSON file

Since this module wipes all data upon deploy, you can import exported JSON data before building. A few important notes:

1. It must be a JSON file, and must conform to a valid structure.

2. Your JSON file must have encoding of utf-8

3. Data imports must be done AFTER you have registered your entities, and BEFORE building.

4. You can only choose to import data based on entity, OR import entire database (data for all entities), but not both.

### 1.2.1 Importing Data Based on Entity: Example

```javascript
DB.registerEntity("categories");
DB.registerEntity("comments");

// add data import path
DB.importJSONFileForEntity(
  DB.getEntities().categories,
  "test/pathToYourJSONfile/categories.json"
);

DB.importJSONFileForEntity(
  DB.getEntities().comments,
  "test/pathToYourJSONfile/comments.json"
);

DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
  env: "dev",
});
```

### 1.2.2 Importing Data Based on Entity: JSON Structure

For importing data based on entity, your JSON must be a LIST/ARRAY of entity objects. General structure:

```json
[
    { ... },
    { ... }
],
```

> Note that this structure is different from Importing Data for Entire Database (See next section).

Example for `categories.json` :

```json
[
  {
    "id": "4321",
    "name": "Personal Development & Productivity"
  },
  {
    "id": "5432",
    "name": "Sports"
  }
]
```

Example for `comments.json` :

```json
[
  {
    "id": "4567",
    "comment": "Awesome!",
    "author": "John Wick"
  },
  {
    "id": "7654",
    "comment": "Pretty cool stuff",
    "author": "Danny"
  }
]
```

### 1.3.1 Importing Data for Entire Database: Example

```javascript
// register your entities
DB.registerEntity("users");
DB.registerEntity("categories");
DB.registerEntity("comments");

// import data for entire database
DB.importJSONFileForEntireDB("tests/pathToYourJSONfile/entireDB.json");

// build
DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
  env: "dev",
});
```

### 1.3.2 Importing Data for Entire Database: JSON Structure

Your JSON must be one single object. The keys should be the entity names, and their values should be a list/array of entity objects. General strucure:

```json
{
    entityName: [{ ... }, { ... }],
    entityName: [{ ... }, { ... }],
}
```

> Note that this structure is different from Importing Data for Based on Entity (See previous section).

Example for `entireDB.json` :

```json
{
  "users": [
    {
      "id": "12345",
      "username": "Ahmad",
      "password": "1234"
    }
  ],
  "categories": [
    {
      "id": "4321",
      "name": "Personal Development & Productivity"
    },
    {
      "id": "5432",
      "name": "Sports"
    }
  ],
  "comments": [
    {
      "id": "4567",
      "comment": "Awesome!",
      "author": "John Wick"
    },
    {
      "id": "7654",
      "comment": "Pretty cool stuff",
      "author": "Danny"
    }
  ]
}
```

# Usage

This module does NOT handle identifier keys, hence you need to use your own techniques/libraries such `uuid`.

## Data Retrieval: All data for Entity

Method: (async) `DB.findAllFor(entity)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

Returns: An array of data objects for that entity.

```javascript
const data = await DB.findAllFor(DB.getEntities().categories);
```

## Data Retrieval: Single Data Object by ID

Method: (async) `DB.findByIdentifierFor(entity)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

Returns: An object with the specified ID. Throws error if not found.

```javascript
const category = await DB.findByIdentifierFor(
  DB.getEntities().categories,
  "4321"
);
```

## Data Retrieval: Single Data Object using a Filter Callback

Method: (async) `DB.findByFilterCallbackFor(entity, filterCallback)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _filterCallback_ : A callback function for filtering specific fields with specific values.

Returns: An object with the specified ID. Throws error if not found.

```javascript
const category2 = await DB.findByFilterCallbackFor(
  DB.getEntities().categories,
  (obj) => {
    return obj.name === "category 2";
  }
);
```

## Data Retrieval: Entire Database

Method: (sync) `DB.getEntireDatabase()`

Arguments: none

Returns: The entire app's data.

> This method may be expensive and is normally used during unit testing. Clients should avoid using this method.

```javascript
const allData = DB.getEntireDatabase();
```

## Data Creation: Single

Method: (async) `DB.createNewFor(entity, data)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _data_ : New data object to be added/created for that entity.

Returns: Updated array of data for that entity.

> Note that this method only stores and updates the database in local memory. To save it, you need to call the `.saveFor` or `.saveAll` method.

```javascript
const data = await DB.createNewFor(DB.getEntities().categories, {
  id: "777",
  name: "My New Category",
});
await DB.saveFor(DB.getEntities().categories);
```

## Data Creation: Many

Method: (async) `DB.createManyNewFor(entity, data)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _data_ : A list/array with wew data objects to be added/created for that entity.

Returns: Updated array of data for that entity.

> Note that this method only stores and updates the database in local memory. To save it, you need to call the `.saveFor` or `.saveAll` method.

```javascript
const data = await DB.createManyNewFor(
  DB.getEntities().categories,
  SAMPLE_CATEGORIES_DATA
);
await DB.saveFor(DB.getEntities().categories);
```

## Data Updates

Method: (async) `DB.updateFor(entity, dataId, data)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _dataId_ : The id of the data object to be updated. Should be a string.

- _data_ : An object containing the key - value pairs of which fields to update and with what values.

Returns: Updated array of data for that entity.

> To maintain data integrity, updating object id's is not allowed.

> Note that this method only stores and updates the database in local memory. To save it, you need to call the `.saveFor` or `.saveAll` method.

```javascript
const data = await DB.updateFor(DB.getEntities().categories, "777", {
  name: "My updated category",
});
await DB.saveFor(DB.getEntities().categories);
```

## Data Deletion

Method: (async) `DB.deleteFor(entity, dataId);`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _dataId_ : The id of the data object to be deleted. Should be a string.

Returns: Updated array of data for that entity.

> Note that this method only stores and updates the database in local memory. To save it, you need to call the `.saveFor` or `.saveAll` method.

```javascript
inMemoryData = await DB.deleteFor(
  DB.getEntities().categories,
  SAMPLE_CATEGORIES_DATA[1].id
);
await DB.saveFor(DB.getEntities().categories);
```

## Data Saving

Methods: (async) `DB.saveFor(entity);` and `DB.saveAll()`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

Returns: void

```javascript
await DB.saveFor(DB.getEntities().categories);

// or to save for all entities
await DB.saveAll();
```

## Data Exporting by Entity

Method: (sync) `DB.exportDataToJSONForEntity(entity, directoryPath, filename);`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _directoryPath_ : Path to the folder you want to export the data to.

- (optional) filename: The name of the file you want to save the exported data to. Default is: `db_export_${entity}.json`

Returns: void

```javascript
DB.exportDataToJSONForEntity(
  DB.getEntities().categories,
  "test/pathToYourDataExportFolder/",
  "your_export_file_name.json"
);
```

## Data Exporting for Entire Database

Method: (sync) `DB.exportEntireDatabaseToJSON(directoryPath, filename);`

Arguments:

- _directoryPath_ : Path to the folder you want to export the data to.

- (optional) filename: The name of the file you want to save the exported data to. Default is: `db_export_${entity}.json`

Returns: void

```javascript
DB.exportEntireDatabaseToJSON(
  "test/pathToYourDataExportFolder/",
  "your_export_file_name.json"
);
```

# Error Handling

All methods in this library throw errors when things go wrong, so it makes sense to wrap your calls with `try and catch`

```javascript
try {
  await DB.createNewFor(DB.getEntities().categories, {
    id: "777",
    name: "My New Category",
  });
  // save all
  await DB.saveAll();
} catch (e) {
  console.error(e);
  // process your errors
}
```

# References

1. [Singleton Implementation and Module Pattern Discussion](https://stackoverflow.com/questions/1479319/simplest-cleanest-way-to-implement-a-singleton-in-javascript?page=1&tab=scoredesc#tab-top)

2. [Singleton Implementation](https://medium.com/swlh/node-js-and-singleton-pattern-7b08d11c726a)

3. [Private (functional) constructors](https://stackoverflow.com/questions/21667149/how-to-define-private-constructors-in-javascript)

4. [The Javascript Module Pattern](https://www.oreilly.com/library/view/learning-javascript-design/9781449334840/ch09s02.html)

5. [Unit Testing and Mocking with NodeJS](https://blog.logrocket.com/unit-testing-node-js-applications-using-mocha-chai-and-sinon/)
