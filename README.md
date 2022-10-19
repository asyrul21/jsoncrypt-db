# jsoncrypt-db: a simple data store for Node JS

This module presents a simple, lightweight, east-to-use, unstructured (no-sql), encrypted, flexible, and deploy-ready file-based data storage for Node JS. It has only 1 dependency, and allows clients to implement data persistent application without having to think about what database to use (mongo/my-sql/sql server/oracle db etc.), where, and how to deploy them. You can implement it either within your server/backend application, or even deploy it on its own as a service.

Some important notes:

1. This module does not support modern/cloud-based Availability features such as cross-region duplication, sharding, etc.

2. It is suitable if your app is fairly simple and hypothetically will not store very huge amounts of data.

3. This module does not support automatic and scheduled backup.

4. Although the data is encrypted, the authors do not recommend using this module if you work with critical / sensitive data such as Credit Card information and governmental idenfication information.

> IMPORTANT: This module does not support automatic data backup, and all data will be wiped upon re-deploy. To keep your data, you would have to manually export existing entity data or entire database as a JSON file (See: [Data Exporting By Entity](#data-exporting-by-entity) and [Data Exporting for Entire Database](#data-exporting-for-entire-database)), then import that file upon your next deploy session (See [Importing Data from JSON File](#2-importing-data-from-json-file)).

> IMPORTANT: This module also does NOT handle identifier keys, hence you need to use your own techniques/libraries such `uuid`.

# Table of Contents

1. [Installation](#installation)

2. [Basic Setup](#basic-setup)

3. [Advanced Setup](#advanced-setup)

   - [Register Entity Options and Hooks](#1-register-entity-options)

   - [Importing Data from JSON File](#2-importing-data-from-json-file)

     - [Import Data Based on Entity (API)](#221-importing-data-based-on-entity-api)

     - [Import Data Based on Entity (JSON Structure)](#222-importing-data-based-on-entity-json-structure)

     - [Import Data for Entire Database (API)](#231-importing-data-for-entire-database-api)

     - [Import Data for Entire Database (JSON Structure)](#232-importing-data-for-entire-database-json-structure)

4. [Usage and API](#usage-and-api)

   - Data Retrieval

     - [Data Retrieval: All data for an entity](#data-retrieval-array-of-data-objects-for-an-entity)

     - [Data Retrieval: Single data object by ID](#data-retrieval-single-data-object-by-id)

   - Data Manipulation

     - [Data Creation: Single](#data-creation-single)

     - [Data Creation: Many](#data-creation-many)

     - [Data Updates](#data-updates)

     - [Data Deletion](#data-deletion)

     - [Data Saving](#data-saving)

   - Data Exporting

     - [Data Exporting By Entity](#data-exporting-by-entity)

     - [Data Exporting for Entire Database](#data-exporting-for-entire-database)

5. [Error Handling](#error-handling)

6. [Other API Methods](#other-api-methods)

7. [References](#references)

# Installation

```bash
npm install --save jsoncrypt-db
```

# Basic Setup

The two basic steps:

## 1. Registering Your Entities

Method: `DB.registerEntity(entityName, options)`

Arguments:

- _entityName_ : must be a string of a SINGLE PLURAL WORD. eg. "categories"

- _options_ : See [Register Entity Options and Hooks](#1-register-entity-options)

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
const DB = require("jsoncrypt-db");

// 1. register your entities - it should be a string of ONE plural word
DB.registerEntity("categories");
DB.registerEntity("comments");

/* You can now reference your categories with DB.getCategories()
 *  Eg. DB.getEntities().categories
 *  Eg. DB.getEntities().comments
 */

// these are usually stored in .env / environment variables
const SAMPLE_SECRET = "sampleSecret";
const VECTOR_SECRET = "vectorSecret";

// 2. build
DB.build(SAMPLE_SECRET, VECTOR_SECRET, {
  env: "dev", // or process.env.environment or something
});
```

# Advanced Setup

## 1. Register Entity Options

When [registering your entity](#1-registering-your-entities), you can provide options as the second parameter. The options object has three keys you can override:

- _identifierKey_ : The primary key field of your entity. Default is "id". If your entity uses any other field such as _\_id_ or _key_, please specifiy it here.

  ```javascript
  DB.registerEntity("categories", {
    identifierKey: "key",
  });
  ```

- _validateOnCreate_ : (Hook) A function you can provide to perform validations every time when new data for that entity is created and updated. Default is a function that returns `true`.

  ```javascript
  DB.registerEntity("categories", {
    validateOnCreate: (dataObj) => {
      if (!dataObj.name || dataObj.name === "") {
        return false;
      }

      // make sure to return true at the end
      return true;
    },
  });
  ```

- _preSaveTransform_ : (Hook) A function you can provide to perform transformations of data objects for that entity every time before it is created/updated in the data store. This is useful if you want to perform password encryption for user entity, before it is being created/updated. Default is a function that returns the entity data object itself.

  ```javascript
  DB.registerEntity("users", {
    preSaveTransform: (dataObj) => {
      return {
        ...dataObj,
        password: encryptPassword(dataObj.password),
      };
    },
  });
  ```

## 2. Importing Data from JSON file

Since this module wipes all data upon deploy, you can import exported JSON data before building. A few important notes:

1. It must be a JSON file, and must conform to a valid structure.

2. Your JSON file must have encoding of utf-8.

3. To ensure seamless integration, use our Export methods ([Data Exporting By Entity](#data-exporting-by-entity) and [Data Exporting for Entire Database](#data-exporting-for-entire-database)) to guarrantee a valid json strucutre.

4. Data imports must be done AFTER you have registered your entities, and BEFORE building.

5. You can only choose to import data based on entity, OR import entire database (data for all entities), but not both.

### 2.2.1 Importing Data Based on Entity: API

Method: (async) `DB.importDataFromJSONFileForEntity(entity, pathToTheFile);`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _pathToTheFile_ : Path to your json file. Make sure to include the `.json` extension.

Returns: void

Example:

```javascript
DB.registerEntity("categories");
DB.registerEntity("comments");

// add data import path
DB.importDataFromJSONFileForEntity(
  DB.getEntities().categories,
  "test/pathToYourJSONfile/categories.json"
);

DB.importDataFromJSONFileForEntity(
  DB.getEntities().comments,
  "test/pathToYourJSONfile/comments.json"
);

DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
  env: "dev",
});
```

### 2.2.2 Importing Data Based on Entity: JSON Structure

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

### 2.3.1 Importing Data for Entire Database: API

Method: (async) `DB.importDataFromJSONFileForEntireDB(pathToTheFile);`

Arguments:

- _pathToTheFile_ : Path to your json file. Make sure to include the `.json` extension.

Returns: void

Example:

```javascript
// register your entities
DB.registerEntity("users");
DB.registerEntity("categories");
DB.registerEntity("comments");

// import data for entire database
DB.importDataFromJSONFileForEntireDB("tests/pathToYourJSONfile/entireDB.json");

// build
DB.build(SAMPLE_SECRET, SAMPLE_VECTOR, {
  env: "dev",
});
```

### 2.3.2 Importing Data for Entire Database: JSON Structure

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

# Usage and API

This module does NOT handle identifier keys, hence you need to use your own techniques/libraries such `uuid`.

## Data Retrieval: Array of Data Objects for an Entity

Method: (async) `DB.findFor(entity, filterCallback = null)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _filterCallback_ : (optional) A callback function for filtering specific fields with specific values.

Returns: An array of (filtered or not) data objects for that entity.

```javascript
// retrieve all
const data = await DB.findFor(DB.getEntities().categories);
// retrieve based on filter
const data = await DB.findFor(DB.getEntities().categories, (obj) => {
  return obj.name === "category 2";
});
```

## Data Retrieval: Single Data Object by ID

Method: (async) `DB.findByIdentifierFor(entity, dataId)`

Arguments:

- _entity_ : Registered entity name. Please use the `DB.getEntities()` method to avoid spelling mistakes.

- _dataId_ : The id of the data object to be retrieved.

Returns: An object with the specified ID. Throws error if not found.

```javascript
const category = await DB.findByIdentifierFor(
  DB.getEntities().categories,
  "4321"
);
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

- _data_ : A list/array with new data objects to be added/created for that entity.

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

- (optional) filename: The name of the file you want to save the exported data to. Default is: `db_export_all.json`

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

# Other API Methods

1. Method: (sync) `DB.getEntities()`

   Arguments: none

   Returns: An object with entity names as keys, and their respective names in string values as values.

   Description: This method should be used at every place an entity name is expected. (except for `registerEntity`)

2. Method: (sync) `DB._resetDBAndDeleteAllData()`

   Arguments: none

   Returns: void

   Description: This method is meant for testing purposes only. Clients should avoid using it.

3. Method: (sync) `DB.isUp()`

   Arguments: none

   Returns: boolean

   Description: This method returns true if database has been setup, built and is currently storing data.

4. Method: (sync) `DB.removeEntityAndDeleteEntityData(entityName)`

   Arguments:

   - entityName: The name of the entity

   Returns: void

   Description: This method is meant for testing purposes only. Clients should avoid using it.

5. Method: (sync) `DB.getEntireDatabase()`

   Arguments: none

   Returns: The entire app's data.

   Description: This method may be expensive and is normally used during unit testing. Clients should avoid using this method.

# References

1. [Singleton Implementation and Module Pattern Discussion](https://stackoverflow.com/questions/1479319/simplest-cleanest-way-to-implement-a-singleton-in-javascript?page=1&tab=scoredesc#tab-top)

2. [Singleton Implementation](https://medium.com/swlh/node-js-and-singleton-pattern-7b08d11c726a)

3. [Private (functional) constructors](https://stackoverflow.com/questions/21667149/how-to-define-private-constructors-in-javascript)

4. [The Javascript Module Pattern](https://www.oreilly.com/library/view/learning-javascript-design/9781449334840/ch09s02.html)

5. [Unit Testing and Mocking with NodeJS](https://blog.logrocket.com/unit-testing-node-js-applications-using-mocha-chai-and-sinon/)
