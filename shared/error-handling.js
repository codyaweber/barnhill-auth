/*
Error handlers for auth routes
*/

"use strict";

const root = require("rootrequire");
const CustomError = require(root + "/shared/CustomError");
const knex = require("knex");

module.exports = {
  processError,
  unauthorized,
  requestError,
  forbidden,
  notFound,
  getErrorResponseForClient
};


function processError(err, res, customHandler) {

  // console.log(err);
  
  // Use custom handler if provided
  if(err.constructor.name == CustomError.name && customHandler !== undefined) {
    customHandler(err, res);
    return;
  }
  
  const errorResponse = getErrorResponseForClient(err);
  res.status(errorResponse.status).json(errorResponse.error);
}

function getErrorResponseForClient(err) {
  let errorResponse;
  
  switch(err.constructor.name) {
    case "RequestError":
      // MSSQL Error (probably from Knex)
      errorResponse = MSSQLError(err);
      break;
    case CustomError.name:
      errorResponse = handleCustomError(err);
      break;
    default:
      errorResponse = unknownError(err);
      break;
  }
  
  return errorResponse;
  
}

function MSSQLError(err) {
  const errNumber = err.number;

  //Start with default message, and customize it if possible with logic below
  let error = new CustomError("db_unknown_error", "There was an unexpected error processing the request.");

  switch(errNumber) {
  case 241:
    error.error = "db_conversion_error";
    error.message = "Conversion from string to date failed. Please enter a valid date.";
    break;
  case 248:
    error.error = "db_overflow_error";
    error.message = "One of the submitted parameters was probably too large.";
    break;
  case 257:
    error.error = "db_conversion_error";
    error.message = "Data conversion failed."
    break;
  case 544:
    error.error = "db_identity_insert_error";
    error.message = "IDs cannot be explicitly inserted into the database."
    break;
  case 547:
    error.error = "db_foreign_key_error";
    error.message = "One of the references used refers to an item that does not exist in the database.";
    break;
  case 2627:
    error.error = "db_unique_error";
    error.message = "One of the values inserted already exists, but must be unique."
    break;
  case 8102:
    error.error = "db_identity_update_error";
    error.message = "IDs cannot be updated.";
    break;
  case 8152:
    error.error = "db_truncation_error";
    error.message = "One of the values being inserted is too long.";
    break;
  case "ETIMEOUT":
    error.error = "db_timeout_error";
    error.message = "The request failed to complete in the allotted time.";
    break;
  default:
    break;
  }
  
  return {
    error,
    status: 422
  };
}

//Handle errors of class CustomError
function handleCustomError(error) {
  let status = 500;

  switch(error.error) {
  case "invalid_credentials":
    status = 401;
    break;
  case "item_exists":
    status = 409;
    break;
  case "invalid_category":
    status = 422;
    break;
  case "invalid_contributor":
    status = 422;
    break;
  default:
    break;
  }

  return {
    error,
    status
  };
}

function unknownError(err) {
  console.error("Unknown server error: " + err);

  console.log(err);
  console.log(err.constructor.name);

  const error = new CustomError("unknown_error", "There was an unknown error processing the request.");
  return {
    error,
    status: 500
  };
}

//Login error handling
function unauthorized(err, res) {
  res.status(401).json(err);
}

function forbidden(err, res) {
  res.status(403).json(err);
}

function notFound(err, res) {
  res.status(404).json(err);
}

//Generic request error handler
function requestError(err, res) {
  res.status(422).json(err);
}
