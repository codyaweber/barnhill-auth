/*
Helper methods for database interactions
*/

"use strict";

module.exports = {
  arraysUnion,
  createJunctionRowsFrom,
  dateString,
  filterDuplicates,
  first,
  forceArray,
  generateFileName,
  getKnexInParamStringFromArray,
  getTimestamp,
  pluckId,
  pop,
  randomString,
  shuffle
};

function arraysUnion(arr1, arr2) {
  const merged = arr1.concat(arr2);
  return filterDuplicates(merged);
}

function createJunctionRowsFrom(key1, singularId, key2, idsArray) {
  const now = getTimestamp();
  
  return idsArray.map(id => {
    return {
      [key1] : singularId,
      [key2] : id,
      ["createdAt"] : now,
      ["updatedAt"] : now
    }
  })
}

// Return MM-DD-YY from date object
function dateString(hyphenated = true) {
  const date = new Date();

  let month = ("0" + (date.getMonth() + 1)).slice(-2);
  //Need to use UTC date so time zone doesn't mess up day number
  let day = ("0" + date.getUTCDate()).slice(-2);
  let year = `${date.getFullYear()}`.slice(-2);
  
  const joinCharacter = hyphenated ? '-' : '';
  const dateStr = [month, day, year].join(joinCharacter);
  return dateStr;
}

//Given an array, return a new array without any duplicates
function filterDuplicates(arr) {
  // Making a new set from an array only includes elements once. Making an array
  // from that set is a unique, ordered version of original array
  return Array.from(new Set(arr));
}

// Return first item from array if present, else null
function first(array) {
  if(array === undefined || array.length === 0) {
    return null;
  }
  return array[0];
}

function getKnexInParamStringFromArray(arr) {
  let str = "";
  
  arr.forEach((item, index) => {
    str += "?"
    if(index != arr.length - 1) {
      str += ","
    }
  })
  
  return `(${str})`
}

// Ensure argument is an array; else return it wrapped in one
function forceArray(v) {
  if(!Array.isArray(v)) {
    v = [v];
  }
  
  return v;
}

function generateFileName(userId = null) {
  const hyphenated = false;
  const dateStr = dateString(hyphenated);
  const randomStr = randomString();
  let str = ``;
  if(userId) {
    str += `${userId}-`;
  }
  return `${str}${dateStr}-${randomStr}.jpg`;
}

// Return ISO8601 now timestamp
function getTimestamp() {
  const date = new Date();
  return date.toISOString();
}

// Pop value for key from object
function pop(key, obj) {
  var result = obj[key];
  delete obj[key];
  return result;
}

/* Given an array of objects with the same key, return an array of just that
key's value from all of the objects */
function pluckId(objects, key = "id") {
  return objects.map( obj => obj[key] );
}

// Return a random string of ~10 characters
function randomString() {
  return Math.random().toString(36).substring(8, 15) + Math.random().toString(36).substring(8, 15);
}

// Array randomizer
function shuffle(array) {
  let currentIndex = array.length;
  let randomIndex;
  let temporaryValue;

  // While there remain elements to shuffle
  while (0 !== currentIndex) {

    // Pick a remaining element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
