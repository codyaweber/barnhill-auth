/*
Database operations for resource packs
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
  selectAllIds,
  selectIdsPaginated,
  selectById,
  selectIdsBySearch
};

function insert(resourcePack) {
  resourcePack[s.col_niceTitle] = resourcePack[s.col_title].replace(/\s+/g, '').toLowerCase();

  resourcePack[s.col_createdAt] = h.getTimestamp();
  resourcePack[s.col_updatedAt] = h.getTimestamp();

  return knex(s.table_ResourcePack)
  .returning("*")
  .insert(resourcePack)
  .then(h.first);
}


function update(resourcePack) {
  resourcePack[s.col_niceTitle] = resourcePack[s.col_title].replace(/\s+/g, '').toLowerCase();
  resourcePack[s.col_updatedAt] = h.getTimestamp();

  const id = h.pop(s.col_id, resourcePack);

  return knex(s.table_ResourcePack)
  .where({ [s.col_id] : id })
  .returning("*")
  .update(resourcePack)
  .then(h.first);
}

/* Query all resource packs */
function selectAll() {
  return knex.select("*").from(s.table_ResourcePack);
}

/* Get id's of all resource packs */
function selectAllIds() {
  return knex.select(s.col_id)
  .from(s.table_ResourcePack)
  .then(h.pluckId);
}

/* Select ids of resource packs with limit and offset parameters */
function selectIdsPaginated(offset, limit) {
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_ResourcePack,
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

/* Get single resource pack by id */
function selectById(id) {
  return knex(s.table_ResourcePack)
  .where({
    [s.col_id] : id
  })
  .then(h.first);
}

/* Get ids of resource packs by search term */
function selectIdsBySearch(text) {

  return knex.select(s.col_id)
  .from(s.table_ResourcePack)
  .where(s.col_niceTitle, "LIKE", "%" + text + "%")
  .orderBy(s.col_niceTitle, s.val_ascending)
  .then(h.pluckId)
}
