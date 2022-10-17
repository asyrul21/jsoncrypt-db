const stringHasValue = (str) => {
  return str && str !== null && str !== undefined && str !== "";
};

const arrayHasValue = (arr) => {
  return arr && arr.length > 0;
};

const booleanHasValue = (val) => {
  return val === true || val === false;
};

const objectHasMethod = (obj, methodName) => {
  return obj[methodName] && typeof obj[methodName] === "function";
};

const enrichDataWithDBProps = (obj, mode = "create") => {
  if (mode === "create") {
    return {
      ...obj,
      createdAt: (function () {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      })(),
      updatedAt: (function () {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      })(),
    };
  }
  // for updates
  return {
    ...obj,
    updatedAt: (function () {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    })(),
  };
};

module.exports = {
  stringHasValue,
  arrayHasValue,
  booleanHasValue,
  objectHasMethod,
  enrichDataWithDBProps,
};
