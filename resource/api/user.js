/*
Methods to handle HTTP data requests for user data
*/

const root = require("rootrequire");
const dbAuth = require(root + "/authorization/db-auth");
const { dbUser } = require(root + "/database/operations");
const handlers = require(root + "/resource/api/http-handlers");


module.exports = {
  getUserInfo,
  updateProfile,
}

// Return current user instance
async function getUserInfo(req, res, next) {
  const userId = req.user.id;
  const { useragent : userAgent } = req;
  
  let user;
  try {
    user = await dbUser.selectUserById(userId);
  } catch(e) {
    console.log("Error fetching user info: ", e);
  }
  
  
  // If in browser, return scopes with user since access token is in an HTTP only
  // cookie and can't be accessed via JavaScript
  if(!userAgent.isApp) {
    // Scopes the user possesses by nature of their role, eg user, editor, admin, etc.
    let standardScopes = [];
    // Additional scopes granted to the user that aren't typical of their role
    let customScopes = [];
    try {
      const standardScopesPromise = dbAuth.selectStandardScopesForUserId(userId);
      const customScopesPromise = dbAuth.selectCustomScopesForUserId(userId);
      // Parentheses required to destructure to existing variable
      ([standardScopes, customScopes] = await Promise.all([standardScopesPromise, customScopesPromise]));
    } catch(e) {
      console.log("Error fetching scopes for user: ", user);
    }
    user.scopes = standardScopes.concat(customScopes);  
  }
  
  handlers.get(user, res);
}

// Update user's profile information
async function updateProfile(req, res, next) {

  const userId = req.user.id;
  const updatedProfile = req.body;
  handlers.tryGet(dbUser.updateProfile, [userId, updatedProfile], res);
}



// const fs = require("fs");
// const fsPr = fs.promises;
// const path = require("path");
// const appDir = path.dirname(require.main.filename);
// // Create a directory in the tmp folder - returns Promise
// function makeDirectoryIfNotExists(directoryName) {
// 
//   //Return if directoryName already exists in /tmp
//   if(fs.existsSync(appDir + "/tmp/" + directoryName)) {
//     return new Promise( (fulfill, reject) => { fulfill(true) });
//   }
// 
//   //Make directoryName in /tmp
//   let dir = appDir + "/tmp/" + directoryName;
//   return fsPr.mkdir(dir, { recursive: true })
//   .then(done => {
//     return true;
//   })
//   .catch(err => {
//     console.log("Error creating directory " + directoryName);
//     throw err;
//   })
// }


// function streamToString (stream) {
//   const chunks = []
//   return new Promise((resolve, reject) => {
//     stream.on('data', chunk => chunks.push(chunk))
//     stream.on('error', reject)
//     stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')))
//   })
// }
