/*
Database operations for tags
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");
const knex = require(root + "/database/knex/setup");

module.exports = {
  insert,
  update,
  selectAll,
  selectById,
  selectAllIds,
  selectIdsPaginated,
  selectIdsBySearch
};

function insert(tag) {
  tag[s.col_niceTitle] = tag[s.col_title].replace(/\s+/g, '').toLowerCase();

  tag[s.col_createdAt] = h.getTimestamp();
  tag[s.col_updatedAt] = h.getTimestamp();

  return knex(s.table_Tag)
  .returning("*")
  .insert(tag)
  .then(h.first);
}


function update(tag) {
  tag[s.col_niceTitle] = tag[s.col_title].replace(/\s+/g, '').toLowerCase();
  tag[s.col_updatedAt] = h.getTimestamp();

  const id = h.pop(s.col_id, tag);

  return knex(s.table_Tag)
  .where({ [s.col_id] : id })
  .returning("*")
  .update(tag)
  .then(h.first);
}


/* Query all tags */
function selectAll() {
  return knex.select("*").from(s.table_Tag);
}

/* Get single tag by id */
function selectById(id) {
  return knex(s.table_Tag)
  .where({
    [s.col_id] : id
  })
  .then(h.first);
}

/* Get ids of all tags */
function selectAllIds() {
  return knex.select(s.col_id)
  .from(s.table_Tag)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

/* Select ids of tags with limit and offset parameters */
function selectIdsPaginated(offset, limit) {
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_Tag,
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

/* Get ids of tags that match search term */
function selectIdsBySearch(text) {
  return knex.select(s.col_id)
  .from(s.table_Tag)
  .where(s.col_niceTitle, "LIKE", "%" + text + "%")
  .orderBy(s.col_niceTitle, s.val_ascending)
  .then(h.pluckId);
}
