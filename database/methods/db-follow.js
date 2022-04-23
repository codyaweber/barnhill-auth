
/*
Database operations for follows
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");
const knex = require(root + "/database/knex/setup");


module.exports = {
  insertFollow,
  deleteFollow,
  selectFollows
};


/* Create a row in Follow table, representing a user follows the contributor */
function insertFollow(userId, contributorId) {

  const now = h.getTimestamp();

  const follow = {
    [s.col_userId] : userId,
    [s.col_contributorId] : contributorId,
    [s.col_createdAt] : now,
    [s.col_updatedAt] : now
  };

  return knex(s.table_Follow)
  .insert(follow)
  .returning("*");
}

/* Delete a row in the Follow table, representing a user unfollowing a contributor */
function deleteFollow(userId, contributorId) {
  return knex(s.table_Follow)
  .where({
    [s.col_userId] : userId,
    [s.col_contributorId] : contributorId
  })
  .del();
}


/* Select ids of contributors user is following */
function selectFollows(userId) {
  return knex(s.table_Follow)
  .select(s.col_contributorId + " as " + s.col_id)
  .where(s.col_userId, userId)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}
