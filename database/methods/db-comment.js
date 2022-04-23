/*
Database operations for comments
*/

"use strict";

const root = require("rootrequire");
const knex = require(root + "/database/knex/setup");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");

module.exports = {
  selectAllIds,
  selectById,
  insertComment,
  updateComment,
  deleteComment
};

/* Select all comments where articleId */
function selectAllIds(articleId) {
  return knex.select(s.col_id)
  .from(s.table_Comment)
  .where(s.col_articleId, articleId)
  .orderBy(s.col_createdAt, s.val_ascending)
  .then(h.pluckId);
}

/* Select comment where id = id */
function selectById(id) {

  return knex.select("*")
  .from(s.table_Comment)
  .where(s.col_id, id)
  .then(h.first);
}

/* Insert commentObj */
function insertComment(commentObj) {

  const now = h.getTimestamp();

  commentObj[s.col_createdAt] = now;
  commentObj[s.col_updatedAt] = now;
  // const parameters = into.concat(columns, values);
  // const query = "INSERT INTO ?? (??,??,??,??,??) VALUES (?,?,?,?,?);";
  // return knex.raw(query, parameters);

  return knex.insert(commentObj)
  .into(s.table_Comment)
  .returning("*")
  .then(h.first);
}

/* Update commentId with newComment */
async function updateComment(newComment) {

  const id = h.pop(s.col_id, newComment);
  const now = h.getTimestamp();

  //Only update text and updatedAt fields
  const comment = {
    [s.col_text] : newComment[s.col_text],
    [s.col_updatedAt] : now
  };

  return knex(s.table_Comment)
  .update(comment)
  .where({[s.col_id] : id})
  .returning("*")
  .then(h.first);
}

/* Delete commentId */
function deleteComment(commentId) {
  return knex(s.table_Comment)
  .where({[s.col_id] : commentId})
  .del();
}
