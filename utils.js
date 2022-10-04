const stringHasValue = (str) => {
  return str && str !== null && str !== undefined && str !== "";
};

const arrayHasValue = (arr) => {
  return arr && arr.length > 0;
};

const booleanHasValue = (val) => {
  return val === true || val === false;
};

module.exports = { stringHasValue, arrayHasValue, booleanHasValue };
