/*
Input validation middleware
*/

"use strict";

//Route parameter validation
const { check, query, body, validationResult } = require("express-validator");
const validator = require("validator");

module.exports = {
  search: validateSearchText(),
  
  getQuoteIdsPaginated : validateOffsetLimit(),
  postQuote : validatePostQuote(),
  putQuote : validatePutQuote(),
  
  updateProfile : validateUpdateProfile(),
};

function validateSearchText() {
  return [
    [query("search").isAlphanumeric()],
    handleValidationErrors
  ];
}

function validatePostQuote() {
  return [
    [
      body("title").isAlphanumeric().isLength({min:3, max:16})
    ],
    handleValidationErrors
  ];
}

function validatePutQuote() {
  //Same as post validation, only check for ID as well
  let postQuoteValidations = validatePostQuote()[0];
  postQuoteValidations.unshift(body("id").isInt());

  return [
    postQuoteValidations,
    handleValidationErrors
  ];
}

function validateUpdateProfile() {
  return [
    [
      // body("email").isEmail(),
      body("firstName").custom(name),
      body("lastName").custom(name),
    ],
    handleValidationErrors
  ];
}

// Validate https url
function isSecureURL(value) {
  const options = {
    protocols : ["https"],
    require_protocol: true,
    require_host: true,
    require_valid_protocol: true
  };

  return validator.isURL(value, options);
} 

function validateOffsetLimit(offset = {min: 0}, limit = {min: 1, max: 50}) {
  return [
    [
      query("offset").optional().isInt(offset),
      query("limit").optional().isInt(limit)
    ],
    handleValidationErrors
  ]
}

/** Validate array of integer ids as request query parameters */
function validateIds(limits = null) {
  let validations = [
    [
      check("ids").exists(),
      check("ids.*").isInt()
    ],
    handleValidationErrors
  ];
  
  if(limits) {
    validations[0].push(
      check("ids").isArray(limits).withMessage(`Ids must be an array with ${limits.min}-${limits.max} values.`),
    )
  }
  
  return validations;
}

/** Generic handler for express-validator validation errors */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if(errors.isEmpty()) {
    next();
    return;
  }


  console.log(errors.array());
  let err = errors.array()[0];
  // console.log(err);

  if(err.nestedErrors !== undefined) {
    err = err.nestedErrors[0];
  }

  const errorType = "invalid_" + err.location;
  let message = `Invalid value for ${err.param}: ${err.value}.`;

  if(err.msg !== "Invalid value") {
    message += " " + err.msg;
  }

  const errorResponse = {
    error : errorType,
    message
  };
  
  res.status(422).send(errorResponse);
}

// Return boolean for string containing:
// letters, spaces and apostrophes
function name(str) {
  return /^[A-Za-z.'\s]+$/.test(str);
}

function alphasAndSpaces(str) {
  return /^[A-Za-z0-9\s]+$/.test(str);
}

// Return boolean for string containing:
// letters, spaces, apostrophes and commas
function title(str) {
  return /^[A-Za-z0-9.,!?'\s]+$/.test(str);
}

// Return boolean for string containing a zipcode
function zipCode(str) {
  return /^[0-9]{5}(?:-[0-9]{4})?$/.test(str);
}

// Return boolean for string containing letters, spaces and commas
function location(str) {
  return /^[A-Za-z.,\s]+$/.test(str);
}


// const urlOptions = {
//   protocols : ["https"],
//   require_protocol: true,
//   require_host: true,
//   require_valid_protocol: true,
//   require_tld: true
// };
