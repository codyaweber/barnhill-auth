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
  selectById,
  selectIdsByType
};

function insert(imageURL, type) {
  // insert into dbo.ContentImage(url, imageType) values
  // ('https://www.image.com/location', (
  //   select id from ContentImageType where imageType = 'articleCoverRaw'
  // ));
  const query = `insert into ??(??, ??) values (?, (select ?? from ?? where ?? = ?));`
  const parameters = [
    // insert into
    s.table_ContentImage,
    // (
    s.col_url,
    s.col_imageType,
    // ) values (
    imageURL,
    // (select
    s.col_id,
    // from
    s.table_ContentImageType,
    // where
    s.col_imageType,
    // =
    type,
    // ));
  ]

  return knex.raw(query, parameters)
  .then(h.first)
}


function selectById(id) {
  const query = `select ?? from ?? where ?? = ?;`
  const parameters = [
    // select
    '*',
    // from
    s.table_ContentImage,
    // where
    s.col_id,
    // =
    id,
  ];
  
  return knex.raw(query, parameters)
  .then(h.first)
}

function selectIdsByType(imageType) {
  // select id from ContentImage where imageType = (
  // 	select id from ContentImageType where imageType = 'contributorHeadshotRaw'
  // )
  const query = `select ?? from ?? where ?? = (select ?? from ?? where ?? = ?);`
  
  const parameters = [
    //select 
    s.col_id,
    // from 
    s.table_ContentImage,
    // where
    s.col_imageType,
    // = (select
    s.col_id,
    // from
    s.table_ContentImageType,
    // where
    s.col_imageType,
    // =
    imageType
    // );
  ];
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}
