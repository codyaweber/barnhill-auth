/*
One-off database operations
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");
const knex = require(root + "/database/knex/setup");

module.exports = {
  insert,
  update,
  selectAllIds,
  selectIdsPaginated,
  selectById
}

function insert(profileBackgroundImage) {
  profileBackgroundImage[s.col_createdAt] = h.getTimestamp();
  profileBackgroundImage[s.col_updatedAt] = h.getTimestamp();

  return knex(s.table_ProfileBackgroundImage)
  .returning("*")
  .insert(profileBackgroundImage)
  .then(h.first);
}

function update(profileBackgroundImage) {
  profileBackgroundImage[s.col_updatedAt] = h.getTimestamp();

  const id = h.pop(s.col_id, profileBackgroundImage);

  return knex(s.table_ProfileBackgroundImage)
  .where({ [s.col_id] : id })
  .returning("*")
  .update(profileBackgroundImage)
  .then(h.first);
}


/* Select images user can choose from for profile background image */
function selectAllIds() {

  return knex.select(s.col_id)
  .from(s.table_ProfileBackgroundImage)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

/* Select ids of profile background images with limit and offset parameters */
function selectIdsPaginated(offset, limit) {
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_ProfileBackgroundImage,
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

function selectById(id) {

  return knex.select("*")
  .from(s.table_ProfileBackgroundImage)
  .where(s.col_id, id)
  .then(h.first);
}
