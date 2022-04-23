/*
Setup for Knex query builder
*/

"use strict";

const username = process.env.AZURE_USERNAME;
const password = process.env.AZURE_PASSWORD;
const database = process.env.AZURE_DATABASE;
const host = process.env.AZURE_SERVER;

var knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: host,
    port: 3306,
    user: username,
    password: password,
    database: database,
  }
});


knex.on("query", (data) => {
  console.log(data.sql);
})

knex.on("query-error", (data) => {
  console.log("Query error:")
  console.log(data);
})

module.exports = knex;
