/*
Application permissions
*/

"use strict";

// CRUD
const create = "create";
const read = "read";
const update = "update";
const del = "delete";

// CRUD domains
const quote = "quote";

// Content
const createQuote =     create +  ":" + quote;
const readQuote   =     read +    ":" + quote;
const updateQuote =     update +  ":" + quote;
const deleteQuote =     del +     ":" + quote;

// OAuth 2.0
const offline_access = "offline_access";
const profile = "profile";
const email = "email";

// Developer Only
const be_developer = "be:developer";


const appScopes = {

  createQuote,
  readQuote,
  updateQuote,
  deleteQuote,

  offline_access,
  profile,
  email,
  
  be_developer,
}

module.exports = appScopes;
