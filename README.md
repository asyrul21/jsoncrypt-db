# Simple DB fro Node JS

This module presents a simple, serverless, encrypted, and deploy-ready data storage for Node JS. It stores essentially JSON data, but they are encrypted, hence enabling clients to push and pull relatively sensitive data (such as your name, address, where you studied, where you work etc.) to source control platforms such as git. That being said, do NOT use this module if your app stores critically sensitive data, such as Credit Card information and governmental idenfication information.

It has only 1 dependency, and allows clients to implement deploy-ready data persistent application without having to think about what database to use (mongo/my-sql/sql server/oracle db etc.), where, and how to deploy them. It resides just next to your server application (nodeJS).

This data store module fits well if your app:

1. is written in NodeJS

2. is relatively simple and does not need Availability features such as cross-region duplication, sharding, etc.

3. Hypothetically will not store very huge amount of data

4. Do not need automatic/scheduled backup

5. Does not work with critical / sensitive data such as Credit Card information and governmental idenfication information.

# Basic Setup

The two basic steps:

## 1. Registering Your Entities

Method: `DB.registerEntities(entityName, options)`

Arguments:

- _entityName_ : must be a string of a SINGLE PLURAL WORD. eg. "categories"

- _options_ : So far this has three keys you can override:

  - _identifierKey_ : The primary key field of your entity. Default is "id"

  - _validateOnCreate_ : (Hook) A function you can provide to perform validations new data for that entity is added/created. Default is a function that returns `true`.

  - _preSaveTransform_ : (Hook) A function you can provide to perform transformations of data objects for that entity before it is created/updated in the data store. This is useful if you want to perform password encryption for user entity, before it is being created/updated. Default is a function that returns the entity data object itself.

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

// these are usually stored in .env / environment variables
const SAMPLE_SECRET = "sampleSecret";
const VECTOR_SECRET = "vectorSecret";

// 2. build
DB.build(SAMPLE_SECRET, VECTOR_SECRET, {
  env: "dev",
  isTestMode: false,
});
```

# Advanced Setup

TODO

# Usage

TODO

# References

1. [Singleton Implementation and Module Pattern Discussion](https://stackoverflow.com/questions/1479319/simplest-cleanest-way-to-implement-a-singleton-in-javascript?page=1&tab=scoredesc#tab-top)

2. [Singleton Implementation](https://medium.com/swlh/node-js-and-singleton-pattern-7b08d11c726a)

3. [Private (functional) constructors](https://stackoverflow.com/questions/21667149/how-to-define-private-constructors-in-javascript)

4. [The Javascript Module Pattern](https://www.oreilly.com/library/view/learning-javascript-design/9781449334840/ch09s02.html)

5. [Unit Testing and Mocking with NodeJS](https://blog.logrocket.com/unit-testing-node-js-applications-using-mocha-chai-and-sinon/)
