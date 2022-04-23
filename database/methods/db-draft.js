/*
Database operations for drafts
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");
const knex = require(root + "/database/knex/setup");

// DON'T CHANGE - this corresponds to database table values
const draftTypeIds = {
  article : 1,
  category : 2,
  contributor : 3,
  profileBackground : 4,
  resourcePack : 5,
  tag : 6
}

module.exports = {
  selectDraftById,
  selectIdsOfType,
  insertDraft,
  updateDraft,
  deleteDraft
}

async function selectDraftById(id) {
  const parameters = [
    // select
    '*',
    // from 
    s.table_ContentDraft,
    // where
    s.col_id,
    // = 
    id
  ];
  
  const query = `select ?? from ?? where ?? = ?;`
  
  return knex.raw(query, parameters)
  .then(h.first);
}

async function selectIdsOfType(type, pendingPublish) {
  let whereTypeEquals;
  switch(type) {
    case "articles":
      whereTypeEquals = draftTypeIds.article;
      break;
    case "categories":
      whereTypeEquals = draftTypeIds.category;
      break;
    case "contributors":
      whereTypeEquals = draftTypeIds.contributor;
      break;
    case "profile-background-images":
      whereTypeEquals = draftTypeIds.profileBackground;
      break;
    case "resource-packs":
      whereTypeEquals = draftTypeIds.resourcePack;
      break;
    case "tags":
      whereTypeEquals = draftTypeIds.tag;
      break;
    default:
      return null;
  };
  
  const parameters = [
    // select
    '*',
    // from
    s.table_ContentDraft,
    // where
    s.col_draftType,
    // =
    whereTypeEquals,
    // and
    s.col_pendingPublish,
    // =
    pendingPublish
  ];
  
  const query = `select ?? from ?? where ?? = ? and ?? = ?`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}


async function insertDraft(authorId, typeId, json) {
  
  const jsonContent = JSON.stringify(json);
  
  const publishedId = h.pop(s.col_publishedId, json) || null;
  const pendingPublish = h.pop(s.col_pendingPublish, json) || false;
  // insert into ContentDraft (draftType, jsonContent, publishedId, authorId, createdAt, updatedAt) values
  // (6, '{}', null, 2, current_timestamp, current_timestamp);
  const now = h.getTimestamp();
  
  const parameters = [
    // insert into
    s.table_ContentDraft,
    // (
    s.col_draftType,
    s.col_jsonContent,
    s.col_publishedId,
    s.col_authorId,
    s.col_pendingPublish,
    s.col_createdAt,
    s.col_updatedAt,
    // ) values (
    typeId,
    jsonContent,
    publishedId,
    authorId,
    pendingPublish,
    now,
    now,
    // ); select scope_identity() as
    s.col_id
  ];
  
  const query = `insert into ?? (??, ??, ??, ??, ??, ??, ??) values
  (?, ?, ?, ?, ?, ?, ?); SELECT SCOPE_IDENTITY() AS ??;`
  
  return knex.raw(query, parameters)
  .then(h.pluckId)
  .then(h.first);
}

async function updateDraft(json) {
  const id = h.pop(s.col_id, json);
  const jsonContent = JSON.stringify(json);
  const pendingPublish = h.pop(s.col_pendingPublish, json) || false;
  const now = h.getTimestamp();
  
  // update ContentDraft set  where id = 2;
  
  const parameters = [
    // update
    s.table_ContentDraft,
    // set
    s.col_jsonContent,
    // =
    jsonContent,
    s.col_pendingPublish,
    // =
    pendingPublish,
    s.col_updatedAt,
    // = 
    now,
    // where
    s.col_id,
    // = 
    id
  ];
  
  const query = `update ?? set ?? = ?, ?? = ?, ?? = ? where ?? = ?;`
  
  return knex.raw(query, parameters)
}

async function deleteDraft(id) {
  // const parameters = [
  //   // delete from
  //   s.table_ContentDraft,
  //   // where
  //   s.col_id,
  //   // =
  //   id
  // ]
  // 
  // const query = `delete from ?? where ?? = ?;`;
  
  // Returns the number of rows deleted
  return knex(s.table_ContentDraft)
  .where({
    [s.col_id] : id
  })
  .del()
}
