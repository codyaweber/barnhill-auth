/*
Quote route handlers
*/

"use strict";

const root = require("rootrequire");
const { dbQuote } = require(root + "/database/operations");
const handlers = require(root + "/resource/api/http-handlers");
const errors = require(root + "/shared/error-handling");

module.exports = {
  post,
  put,
  getWithId,
  getAll,
  getAllIds,
  getIdsPaginated,
  getIdsBySearch
};

//Create a new quote
function post(req, res, next) {
  const quote = req.body;
  dbQuote.insert(quote)
    .then(result => {
      res.status(201).json(result);
    })
    .catch(err => errors.processError(err, res));
}

//Update quote
async function put(req, res, next) {
  const quote = req.body;
  handlers.tryPut(dbQuote.update, quote, req, res);
}

//Fetch quote by id
async function getWithId(req, res, next) {
  const id = req.params.id;
  handlers.tryGet(dbQuote.selectById, id, res);
}

//Fetch all quotes
function getAll(req, res, next) {
  handlers.tryGet(dbQuote.selectAll, undefined, res);
}

//Fetch ids of all quotes
function getAllIds(req, res, next) {
  handlers.tryGet(dbQuote.selectAllIds, undefined, res);
}

// Fetch ids of quotes with pagination parameters
function getIdsPaginated(req, res, next) {
  const { offset, limit } = req.query;
  handlers.tryGet(dbQuote.selectIdsPaginated, [offset, limit], res)
}

//Fetch quote ids by search term
function getIdsBySearch(req, res, next) {
  const text = req.query.search;
  handlers.tryGet(dbQuote.selectIdsBySearch, text, res);
}
