/*
Database operations for contributors
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");
const knex = require(root + "/database/knex/setup");

module.exports = {
  insert,
  update,
  selectById,
  selectAllIds,
  selectIdsPaginated,
  selectFollowerIds,
  selectArticleIds,
  selectIdsBySearch,
  idExists
}

function insert(contributor) {
  contributor[s.col_niceName] = contributor[s.col_name].replace(/\s+/g, '').toLowerCase();

  contributor[s.col_createdAt] = h.getTimestamp();
  contributor[s.col_updatedAt] = h.getTimestamp();

  return knex(s.table_Contributor)
  .returning("*")
  .insert(contributor)
  .then(h.first);
}

function update(contributor) {
  contributor[s.col_niceName] = contributor[s.col_name].replace(/\s+/g, '').toLowerCase();
  contributor[s.col_updatedAt] = h.getTimestamp();

  const id = h.pop(s.col_id, contributor);

  return knex(s.table_Contributor)
  .where({ [s.col_id] : id })
  .returning("*")
  .update(contributor)
  .then(h.first);
}

/* Get single contributor by id */
function selectById(id) {
  return knex(s.table_Contributor)
  .where({
    [s.col_id] : id
  })
  .then(h.first);
}

/* Get ids of all contributors */
function selectAllIds() {
  return knex.select(s.col_id)
  .from(s.table_Contributor)
  .then(h.pluckId);
}

/* Select ids of contributors with limit and offset parameters */
function selectIdsPaginated(offset, limit) {
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_Contributor,
    // ORDER BY
    s.col_createdAt,
    // DESC OFFSET
    parseInt(offset),
    // ROWS FETCH NEXT
    parseInt(limit)
    // ROWS ONLY
  ];
  
  const query = `SELECT ?? FROM ?? 
  ORDER BY ?? DESC 
  OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

/* Get ids of contributor's followers */
function selectFollowerIds(contributorId) {
  return knex.select(s.table_Follow + "." + s.col_userId + " AS " + s.col_id)
  .from(s.table_Follow)
  .where(s.col_contributorId, contributorId)
  .then(h.pluckId);
}

/* Get ids of articles created by contributors (OR, not AND) */
function selectArticleIds(contributorIds) {
  return knex.select(s.col_articleId + " AS " + s.col_id)
  .from(s.table_Article_Contributor)
  .whereIn(s.col_contributorId, contributorIds)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

/* Get ids of contributors by search term */
function selectIdsBySearch(text) {

  return knex.select(s.col_id)
  .from(s.table_Contributor)
  .where(s.col_niceName, "LIKE", "%" + text + "%")
  .orderBy(s.col_niceName, s.val_ascending)
  .then(h.pluckId)
}

// Return boolean for whether or not the id exists in the table
function idExists(id) {
  return knex.select("*")
  .from(s.table_Contributor)
  .where(s.col_id, id)
  .then(h.pluckId)
  .then(ids => {
    return ids.length === 1;
  })
}
