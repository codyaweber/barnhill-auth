/*
Worker cluster setup
*/

"use strict";

const root = require("rootrequire");
const cluster = require("cluster");

const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')
const cors = require("cors");
const useragent = require('express-useragent');

const express = require("express");
// Workers share the TCP connection in this server
const app = express();
// const expressWs = require('express-ws')(app);
const router = require(root + "/routes");

setUpWorker();

function setUpWorker() {
  // Parse query parameters
  app.use(bodyParser.urlencoded({ extended: true }));
  // Parse JSON and set to req.body
  app.use(bodyParser.json());
  app.use(handleBodyParserErrors);
  // Parse 'Cookie' header and populate req.cookies with an object containing cookie names
  app.use(cookieParser());
  // Parse useragent of request and set to req.useragent
  app.use(useragent.express());
  
  app.use(cors({
    // Sets Access-Control-Allow-Credentials for all responses to true
    credentials: true,
    // Sets Access-Control-Allow-Origin to the req.origin, giving origin access to all resources
    origin: true
  }));

  app.set("view engine", "pug");
  const viewLocations = [
    root + "/web/views",
    root + "/web/views/blocks",
    root + "/web/views/editor",
    root + "/web/views/templates",
  ];
  app.set("views", viewLocations);


  const port = process.env.PORT;

  // Prevent returning arrays as body root
  app.all("*", objectifyArrays);

  app.use("/", router);
  //Using my own etag system
  app.disable("etag");

  app.listen(port, function() {
    console.log(cluster.worker.id + ": Barn Hill auth server listening on port " + port);
  });  
}


function handleBodyParserErrors(error, req, res, next) {
  if (error instanceof SyntaxError) {
    const err = {
      "error" : "invalid_json",
      "message" : "Invalid json in request body."
    };
    return res.status(400).json(err);
  } else {
    next();
  }
}

// Alter express res.json method to wrap arrays in a JSON object before sending
function objectifyArrays(req, res, next) {
  res.sendJSON = res.json;
  res.json = function(result) {
    let editedResult = result;

    /** Embed an array in a JSON object with key "array" */
    if(Array.isArray(result)) {
      editedResult = {
        array : result
      };
    }
    res.sendJSON(editedResult);
  }

  next();
}


Array.prototype.first = function() {
  if(this.length === 0) {
    return null;
  }
  return this[0];
}
