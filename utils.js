const stringHasValue = (str) => {
  return str && str !== null && str !== undefined && str !== "";
};

const arrayHasValue = (arr) => {
  return arr && arr.length > 0;
};

module.exports = { stringHasValue, arrayHasValue };
