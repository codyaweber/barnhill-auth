/*
Database operations for categories
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
  selectIdsBySearch,
  idExists
}


function insert(category) {
  category[s.col_niceTitle] = category[s.col_title].replace(/\s+/g, '').toLowerCase();

  category[s.col_createdAt] = h.getTimestamp();
  category[s.col_updatedAt] = h.getTimestamp();

  return knex(s.table_Category)
  .returning("*")
  .insert(category)
  .then(h.first);
}


function update(category) {
  category[s.col_niceTitle] = category[s.col_title].replace(/\s+/g, '').toLowerCase();
  category[s.col_updatedAt] = h.getTimestamp();

  const id = h.pop(s.col_id, category);

  return knex(s.table_Category)
  .where({ [s.col_id] : id })
  .returning("*")
  .update(category)
  .then(h.first);
}


/* Query all categories */
function selectAll() {
  return knex.select("*").from(s.table_Category);
}

/* Get single category by id */
function selectById(id) {
  return knex(s.table_Category)
  .where({
    [s.col_id] : id
  })
  .then(h.first);
}

/* Get id's of all categories */
function selectAllIds() {
  return knex.select(s.col_id)
  .from(s.table_Category)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

/* Select ids of categories with limit and offset parameters */
function selectIdsPaginated(offset, limit) {
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_Category,
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

/* Get ids of categories that match search term */
function selectIdsBySearch(text) {
  return knex.select(s.col_id)
  .from(s.table_Category)
  .where(s.col_niceTitle, "LIKE", "%" + text + "%")
  .orderBy(s.col_niceTitle, s.val_ascending)
  .then(h.pluckId);
}

// Return boolean for whether or not the id exists in the table
function idExists(id) {
  return knex.select("*")
  .from(s.table_Category)
  .where(s.col_id, id)
  .then(h.pluckId)
  .then(ids => {
    return ids.length === 1;
  })
}
