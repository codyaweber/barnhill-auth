/*
Exposes methods for database operations
*/

"use strict";

const root = require("rootrequire");
const dbTag = require(root + "/database/methods/db-tag");
const dbUser = require(root + "/database/methods/db-user");

module.exports = {
  dbTag,
  dbUser
}
