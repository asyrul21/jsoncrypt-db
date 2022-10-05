// class AbstractDataModel {
//   #_dataReadWriter;
//   #_dataArray;

//   constructor(initializedDataReadWriter) {
//     if (this.contructor == AbstractDataModel) {
//       throw new Error("Can't instantiate an abstract class.");
//     }
//     if (!initializedDataReadWriter) {
//       throw new Error(
//         "An initialized DB module is required in super() constructor."
//       );
//     }
//     if (
//       initializedDataReadWriter &&
//       !initializedDataReadWriter.isInitialized()
//     ) {
//       throw new Error(
//         "An initialized DB module is required in super() constructor."
//       );
//     }
//     this.#_dataReadWriter = initializedDataReadWriter;
//     this.#_dataArray = this.#_dataReadWriter.readSync(this.entityPluralName());
//   }

//   entityPluralName() {
//     throw new Error("Method [entityName] must be implemented.");
//   }

//   getDataObject() {
//     throw new Error("Method [getDataObject] must be implemented.");
//   }

//   /**
//    * A hook that returns boolean
//    * */
//   validateData(data) {
//     return true;
//   }

//   identifier() {
//     return "id";
//   }

//   async findAll() {
//     console.log("Finding all!");
//     return this.#_dataArray;
//   }

//   async findById(id) {
//     const dataArray = await this.#_dataReadWriter.readAsync(
//       this.entityPluralName()
//     );
//     if (dataArray.length < 1) {
//       return null;
//     }
//     const foundItems = dataArray.filter(
//       (item) => item[this.getEntityObject()] === id
//     );
//     if (foundItems.length > 0) {
//       return foundItems[0];
//     }
//     return null;
//   }

//   async createNew() {
//     const newData = this.getDataObject();
//     if (newData && this.validateData(newData)) {
//       const dataArray = await this.#_dataReadWriter.readAsync(
//         this.entityPluralName()
//       );
//       dataArray.push(newData);
//       this.#_dataArray = [...dataArray];
//       return this.#_dataArray;
//     }
//     // TODO: throw error if fail validation
//     throw new Error("Invalid or non-existent data.");
//     // return null;
//   }

//   async update(newData) {
//     let itemToBeUpdated = this.getDataObject();
//     if (itemToBeUpdated && this.validateData(itemToBeUpdated)) {
//       Object.keys(newData).forEach((k) => {
//         itemToBeUpdated[k] = newData[k];
//       });
//       const dataArray = await this.#_dataReadWriter.readAsync(
//         this.entityPluralName()
//       );
//       dataArray.forEach((item) => {
//         if (item[this.identifier()] === itemToBeUpdated[this.identifier()]) {
//           item[this.identifier()] = { ...itemToBeUpdated };
//         }
//       });
//       this.#_dataArray = [...dataArray];
//       return this.#_dataArray;
//     }
//     // throw if fail validation

//     return null;
//   }

//   async delete() {
//     const itemToBeDeleted = this.getDataObject();
//     let updatedArray;
//     if (itemToBeDeleted && this.validateData(itemToBeDeleted)) {
//       const dataArray = await this.#_dataReadWriter.readAsync(
//         this.entityPluralName()
//       );
//       updatedArray = dataArray.filter(
//         (item) => item[this.identifier()] !== itemToBeDeleted[this.identifier()]
//       );
//       this.#_dataArray = [...updatedArray];
//       return this.#_dataArray;
//     }
//     // throw if fail validation
//     return null;
//   }

//   async save() {
//     return await this.#_dataReadWriter.saveAsync(
//       this.entityPluralName(),
//       this.#_dataArray
//     );
//   }

//   executeSomething() {
//     console.log("Deferred entity name:");
//     console.log(this.entityPluralName());
//   }
// }

// module.exports = AbstractDataModel;
