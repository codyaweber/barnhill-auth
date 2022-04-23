/*
Run database operations for authorization data
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const CustomError = require(root + "/shared/CustomError");
const h = require(root + "/database/methods/support/helpers");
const { bcrypt, sha256, randomStringOfLength } = require(root + "/authorization/crypto");
const knex = require(root + "/database/knex/setup");

module.exports = {
  create,
  insertRefreshToken,
  selectRefreshToken,
  deleteRefreshTokensForUser,
  selectByEmailOrUsernameJoinRole,
  selectUserByEmailOrUsername,
  selectUserById,
  selectUserByIdJoinRole,
  selectRefreshTokenById,
  selectStandardScopesForUserId,
  selectCustomScopesForUserId,
  updateRefreshTokenLastUsed,
  createPasswordReset,
  validatePasswordResetToken,
  deletePasswordReset,
  setPassword
}

/* Add new user to AppUser table */
async function create(username, email, password) {
  
  const user = await selectUserByEmailOrUsername(email, username);
  if(user !== null) {
    let error = "unknown";
    let message = "There was an unexpected error with the request.";
    
    if(user.email == email) {
      //Email is taken
      error = "email_taken";
      message = "An account already exists with that email.";
    }
    if (user.username == username) {
      //Username is taken
      error = "username_taken";
      message = "That username is taken.";
    }
    
    throw new CustomError(error, message);
  }
  
  
  //Username and email are available
  const binaryPassword = await getBufferHashFrom(password);
  const profileBackgroundId = await getRandomProfileBackgroundId();
  const newUser = {
    [s.col_username] : username,
    [s.col_email] : email,
    [s.col_password] : binaryPassword,
    [s.col_profileBackgroundId] : profileBackgroundId,
    //OF BingieYaeV5k - For now, this defaults to true
    [s.col_covenantAgreed] : true,
    //For now, this defaults to 'user' - it might utilize 'subscriber' later
    [s.col_roleId] : 2
  };
  
  return insertUser(newUser)
  .then(userIdObj => {
    const userId = userIdObj[s.col_id];
    return userId;
  })
}

function insertRefreshToken(token, userId) {
  const tokenHash = sha256(token);
  const issuedAt = Math.floor(Date.now() / 1000);
  const now = h.getTimestamp();
  
  const binaryToken = Buffer.from(tokenHash, 'utf8');
  
  const newRefreshTokenRow = {
    [s.col_token] : binaryToken,
    [s.col_issuedAt] : issuedAt,
    [s.col_issuedTo] : userId,
    [s.col_createdAt] : now,
    [s.col_updatedAt] : now
  };
  
  return knex.insert(newRefreshTokenRow)
  .into(s.table_RefreshToken);
}

// Select refresh token with hash matching hash of token parameter
function selectRefreshToken(token) {
  const tokenHash = sha256(token);
  const binary = Buffer.from(tokenHash, "utf8");
  const parameters = [
    // SELECT
    "*",
    // FROM
    s.table_RefreshToken,
    // WHERE
    s.col_token,
    // = 
    binary
  ];
  
  const query = "SELECT ?? FROM ?? WHERE ?? = ?";
  
  return knex.raw(query, parameters)
  .then(h.first);
}

// Delete non-blacklisted refresh tokens associated with userId
function deleteRefreshTokensForUser(userId) {
  return knex(s.table_RefreshToken)
  .where({
    [s.col_issuedTo] : userId,
    [s.col_blacklisted] : false
  })
  .del();
}

function selectByEmailOrUsernameJoinRole(email, username) {
  const select = [
    s.table_AppUser + "." + s.col_id,
    s.table_UserRole + "." + s.col_accessRole,
    s.table_AppUser + "." + s.col_password
  ];
  const from = [
    s.table_AppUser
  ];
  const innerJoin = [
    s.table_UserRole,
    //on
    s.table_AppUser + "." + s.col_roleId,
    s.table_UserRole + "." + s.col_id
  ];
  const where = [
    s.col_email,
    email,
    s.col_username,
    username
  ];
  const parameters = select.concat(from, innerJoin, where);
  const query = "SELECT ??, ??, ?? FROM ?? INNER JOIN ?? ON ?? = ?? WHERE ?? = ? OR ?? = ?;";
  
  return knex.raw(query, parameters)
  .then(h.first);
}

function selectUserByEmailOrUsername(email, username) {
  const select = [
    s.col_id,
    s.col_email,
    s.col_username
  ];
  const from = [
    s.table_AppUser
  ];
  const where = [
    s.col_email,
    email,
    s.col_username,
    username
  ];
  
  const parameters = select.concat(from,where);
  const query = "SELECT ??, ??, ?? FROM ?? WHERE ?? = ? OR ?? = ?;";
  
  return knex.raw(query, parameters)
  .then(h.first);
}

async function selectUserById(id) {
  const select = s.userColumns;
  const from = [s.table_AppUser];
  const where = [
    s.table_AppUser + "." + s.col_id,
    id
  ];

  const parameters = select.concat(from, where);
  const query = "SELECT ??, ??, ??, ??, ??, ??, ??, ??, ??, ??, ??, ??, ??, ??, ?? " +
                "FROM ?? WHERE ?? = ?;";
  const user = await knex.raw(query, parameters).then(h.first);
  const profileBackgroundId = user[s.col_profileBackgroundId];
  const backgroundImage = await selectProfileBackgroundById(profileBackgroundId);

  user[s.col_profileBackground] = backgroundImage;

  return user;
}

function selectUserByIdJoinRole(id) {
  const select = [
    s.table_AppUser + "." + s.col_id,
    s.table_UserRole + "." + s.col_accessRole
  ];
  const from = [
    s.table_AppUser
  ];
  const innerJoin = [
    s.table_UserRole,
    //on
    s.table_AppUser + "." + s.col_roleId,
    s.table_UserRole + "." + s.col_id
  ];
  const where = [
    s.table_AppUser + "." + s.col_id,
    id
  ];
  const parameters = select.concat(from, innerJoin, where);
  const query = "SELECT ??, ?? FROM ?? INNER JOIN ?? ON ?? = ?? WHERE ?? = ?;";

  return knex.raw(query, parameters)
  .then(h.first);
}

function selectRefreshTokenById(id) {
  const select = [
    s.col_id,
    s.col_issuedAt,
    s.col_lastUsed,
    s.col_blacklisted,
    s.col_issuedTo
  ];
  const from = [
    s.table_RefreshToken
  ];
  const where = [
    s.col_id,
    id
  ];

  const parameters = select.concat(from, where);
  const query = "SELECT ??, ??, ??, ??, ?? FROM ?? WHERE ?? = ?;"
  return knex.raw(query, parameters)
  .then(h.first);
}

async function selectStandardScopesForUserId(userId) {
  // select t3.title from AppUser t1
  // join UserRole_AppScope t2 on  t1.roleId = t2.roleId
  // join AppScope t3 on t2.scopeId  = t3.id
  // where t1.id = 2;
  
  const parameters = [
    // select
    s.col_title,
    // from
    s.table_AppUser,
    // t1 join
    s.table_UserRole_AppScope,
    // t2 on t1.
    s.col_roleId,
    // = t2.
    s.col_roleId,
    // join
    s.table_AppScope,
    // t3 on t2.
    s.col_scopeId,
    // = t3
    s.col_id,
    // where t1.
    s.col_id,
    // = 
    userId
  ]
  
  const query = `select t3.?? from ?? t1
                 join ?? t2 on  t1.?? = t2.??
                 join ?? t3 on t2.??  = t3.??
                 where t1.?? = ?`;
                 
  return knex.raw(query, parameters)
  .then(rows => {
    return rows.map(r => r[s.col_title]);
  })
}

async function selectCustomScopesForUserId(userId) {
  // select t2.title from AppUser_AppScope t1
  // join AppScope t2 on t1.scopeId = t2.id
  // where userId = 2;
  
  const parameters = [
    // select
    s.col_title,
    // from 
    s.table_AppUser_AppScope,
    // join
    s.table_AppScope,
    // on
    s.col_scopeId,
    // =
    s.col_id,
    // where
    s.col_userId,
    // =
    userId
  ]
  
  const query = `select t2.?? from ?? t1 join ?? t2 on t1.?? = t2.?? where ?? = ?`;
  
  return knex.raw(query, parameters)
  .then(rows => {
    return rows.map(r => r[s.col_title]);
  })
}



// Set valid refresh token's lastUsed value to now
function updateRefreshTokenLastUsed(refreshToken) {
  const tokenHash = sha256(refreshToken);
  const binary = Buffer.from(tokenHash, "utf8");
  const lastUsed = Math.floor(Date.now() / 1000);
  
  return knex(s.table_RefreshToken)
  .update({
    [s.col_lastUsed] : lastUsed
  })
  .where(s.col_token, binary);
}

async function createPasswordReset(userId) {
  const now = h.getTimestamp();
  // Create and hash token
  const tokenString = randomStringOfLength(24);
  const binaryToken = await getBufferHashFrom(tokenString);

  const row = getPasswordResetRow(userId, binaryToken);
  return knex(s.table_PasswordReset)
  .insert(row)
  .then(done => {
    return tokenString;
  })
}

async function validatePasswordResetToken(userId, token) {
  const hashedPassword = await getBufferHashFrom(token);
  return knex(s.table_PasswordReset)
  .select("*")
  .where(s.col_userId, userId)
  .then(rows => {
    return checkForValidPasswordResetRow(rows, token);
  })
}

function deletePasswordReset(userId) {
  return knex(s.table_PasswordReset)
  .del()
  .where(s.col_userId, userId);
}

async function setPassword(userId, password) {
  const buffer = await getBufferHashFrom(password);
  const now = h.getTimestamp();
  const user = {
    [s.col_password] : buffer,
    [s.col_updatedAt] : now
  };

  return knex(s.table_AppUser)
  .where(s.col_id, userId)
  .update(user)
  .then(h.first)
}



/* ----- Unexported ----- */

function insertUser(userObj) {
  const table = [
    s.table_AppUser
  ];
  const now = h.getTimestamp();

  const columns = [
    s.col_username,
    s.col_email,
    s.col_password,
    s.col_profileBackgroundId,
    s.col_covenantAgreed,
    s.col_roleId,
    s.col_createdAt,
    s.col_updatedAt
  ];

  const values = [
    userObj[s.col_username],
    userObj[s.col_email],
    userObj[s.col_password],
    userObj[s.col_profileBackgroundId],
    userObj[s.col_covenantAgreed],
    userObj[s.col_roleId],
    now,
    now
  ];

  const as = [
    s.col_id
  ];

  const parameters = table.concat(columns, values, as);
  // INSERT INTO UserRole (role, updatedAt, createdAt) VALUES ('newrole', '2019-06-07 16:20:00 +00:00', '2019-06-07 16:20:00 +00:00');
  const query = "INSERT INTO ?? (??, ??, ??, ??, ??, ??, ??, ??) VALUES (?, ?, ?, ?, ?, ?, ?, ?); SELECT SCOPE_IDENTITY() AS ??;";
  return knex.raw(query, parameters)
  .then(h.first);
}

async function getBufferHashFrom(str) {
  const hash = await bcrypt.hash(str);
  const buffer = Buffer.from(hash);
  return buffer;
}

function checkForValidPasswordResetRow(rows, submittedToken) {
  if(rows.length == 0) {
    return false;
  }

  for(let i=0; i<rows.length; i++) {

    const row = rows[i];

    // Validate submitted token against token stored in row
    const tokenBuffer = row[s.col_token];
    const validToken = validateHash(tokenBuffer, submittedToken);

    if(!validToken) {
      continue;
    }

    const createdAtString = row[s.col_createdAt];
    const createdAt = Date.parse(createdAtString);
    const expiration = createdAt + process.env.PASSWORD_RESET_LIFETIME;

    const now = Date.parse(new Date());
    if(expiration > now) {
      // Unexpired row with token found
      return true;
    }
  }

  return false;
}

function getPasswordResetRow(userId, tokenHash) {
  const now = h.getTimestamp();

  return {
    [s.col_userId] : userId,
    [s.col_token] : tokenHash,
    [s.col_createdAt] : now,
    [s.col_updatedAt] : now
  }
}

/* Get random id from ProfileBackgroundImage table */
function getRandomProfileBackgroundId() {
  //Get ids of background images
  return knex(s.table_ProfileBackgroundImage)
  .select(s.col_id)
  .then(h.pluckId)
  .then( ids => {
    //Return random id
    return ids[Math.floor(Math.random() * ids.length)];
  })
}

async function selectProfileBackgroundById(id) {
  const select = [
    [s.col_id],
    [s.col_url]
  ];
  const from = [s.table_ProfileBackgroundImage];
  const where = [
    [s.col_id],
    id
  ];

  const parameters = select.concat(from, where);

  const query = "SELECT ??, ?? FROM ?? WHERE ?? = ?;"

  const profileBackgroundResults = await knex.raw(query, parameters);
  return profileBackgroundResults[0];
}

// Return boolean if password matches hash
function validateHash(hashBuffer, password) {
  // Get hash string from buffer
  const hash = hashBuffer.toString("utf8");
  return bcrypt.compare(password, hash);
}
