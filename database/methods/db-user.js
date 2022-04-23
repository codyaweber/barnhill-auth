/*
Run database operations on personal user data - tags, bookmarks, profiles etc.
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const knex = require(root + "/database/knex/setup");
const h = require(root + "/database/methods/support/helpers");

module.exports = {
  selectAllUserIds,
  bulkSelectUserById,
  selectProfile,
  selectUserById,
  updateProfile,
  updateProfilePhoto,
  selectIdsBySearch,
  selectCategories,
  insertCategories,
  deleteCategories,
  deleteAllCategories,
  // selectAllLeadersExchangeEmails,
  insertFave,
  selectFaves,
  deleteFave,
  insertLike,
  selectLikes,
  deleteLike,
  insertSave,
  selectSaves,
  deleteSave,
  insertArticleFollow,
  selectArticleFollows,
  deleteArticleFollow,
  agreeCovenant
}

// SELECT all user ids excluding the given currentUserId
function selectAllUserIds(currentUserId) {
  // SELECT id, username, name FROM AppUser ORDER BY CASE WHEN niceName IS NOT NULL THEN niceName ELSE username END;
  // Order by niceName if available, else username

  const parameters = [
    // select
    s.col_id,
    // from
    s.table_AppUser,
    // order by case when
    s.col_niceName,
    // is not null then,
    s.col_niceName,
    // else
    s.col_username
    // end
  ]

  const query = "SELECT ?? FROM ?? ORDER BY CASE WHEN ?? IS NOT NULL THEN ?? ELSE ?? END;"
  return knex.raw(query, parameters)
  .then(h.pluckId)
  .then(ids => {
    // Remove currentUserId
    let index = ids.indexOf(currentUserId);
    ids.splice(index, 1);
    return ids;
  })
}

/* Select profile by id */
function selectProfile(userId) {
  const columns = s.userProfileColumns;
  const columnsCount = columns.length;

  return knex
  .select(columns)
  .from(s.table_AppUser)
  .where(s.col_id, userId)
  .then(h.first);
}

// Select user by id
function selectUserById(id) {
  const userAttributes = s.userColumns;

  return knex(s.table_AppUser)
  .select(userAttributes)
  .where(s.col_id, id)
  .then(h.first);
}

function bulkSelectUserById(ids) {
  const userAttributes = s.userColumns;
  
  return knex(s.table_AppUser)
  .select(userAttributes)
  .whereIn(s.col_id, ids)
}

function updateProfile(userId, newProfile) {

  const row = getUpdatedProfileRow(newProfile);

  return knex(s.table_AppUser)
  .where(s.col_id, userId)
  .update(row)
  .returning(s.userColumns)
  .then(h.first);
}

function updateProfilePhoto(userId, photoURL) {
  const now = h.getTimestamp();

  const row = {
    [s.col_photo] : photoURL,
    [s.col_updatedAt] : now
  };

  return knex(s.table_AppUser)
  .where(s.col_id, userId)
  .update(row)
  .returning(s.userColumns)
  .then(h.first);

  return updateProfile(userId, profileObj);
}

// Get object representing database row from profile data argument
function getUpdatedProfileRow(newProfileData) {

  const allowedColumns = s.updateUserProfileColumns;

  const newProfileRow = {};
  for(let key in newProfileData) {
    if(allowedColumns.includes(key) &&
        newProfileData[key] !== undefined) {
          newProfileRow[key] = newProfileData[key];
    }
  }

  // Use name for niceName, otherwise username
  const username = newProfileData[s.col_username]
  const name = newProfileData[s.col_name];
  const preNiceName = (name !== undefined && name != null) ? name : username;

  //Get all lowercase, no spaces
  const niceName = preNiceName.replace(/\s+/g, '').toLowerCase();
  newProfileRow[s.col_niceName] = niceName;

  return newProfileRow;
}

/* Select ids of users by search term */
function selectIdsBySearch(text) {

  return knex.select(s.col_id)
  .from(s.table_AppUser)
  .where(s.col_username, "like", '%' + text + '%')
  .orWhere(s.col_niceName, "like", '%' + text + '%')
  .then(h.pluckId);
}


// Categories
function selectCategories(userId) {

  return knex
  .select(s.col_categoryId + " as " + s.col_id)
  .from(s.table_AppUser_Category)
  .where(s.col_userId, userId)
  .then(h.pluckId);
}

function insertCategories(userId, categoryIds) {

  const categoryRows = createUserCategoryRowsFrom(userId, categoryIds);

  return knex(s.table_AppUser_Category)
  .insert(categoryRows)
  .returning("*");
}

function deleteCategories(userId, categoryIds) {
  return knex(s.table_AppUser_Category)
  .where(s.col_userId, userId)
  .whereIn(s.col_categoryId, categoryIds)
  .del();
}

function deleteAllCategories(userId) {
  return knex(s.table_AppUser_Category)
  .where(s.col_userId, userId)
  .del();
}

function createUserCategoryRowsFrom(userId, categoryIds) {
  const now = h.getTimestamp();

  return categoryIds.map(categoryId => {
    return {
      [s.col_userId] : userId,
      [s.col_categoryId] : categoryId,
      [s.col_createdAt] : now,
      [s.col_updatedAt] : now
    }
  })
}


// Favs
function insertFave(userId, articleId) {

  const fave = h.createJunctionRowsFrom(s.col_userId, userId, s.col_articleId, [articleId]);
  return knex(s.table_AppUser_Fave)
  .insert(fave)
  .returning("*");
}

function selectFaves(userId) {

  return knex
  .select(s.col_articleId + " as " + s.col_id)
  .from(s.table_AppUser_Fave)
  .where(s.col_userId, userId)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

function deleteFave(userId, articleId) {
  return knex(s.table_AppUser_Fave)
  .where(s.col_userId, userId)
  .andWhere(s.col_articleId, articleId)
  .del();
}


// Likes
function insertLike(userId, articleId) {

  const like = h.createJunctionRowsFrom(s.col_userId, userId, s.col_articleId, [articleId]);
  return knex(s.table_AppUser_Like)
  .insert(like)
  .returning("*");
}

function selectLikes(userId) {
  return knex
  .select(s.col_articleId + " as " + s.col_id)
  .from(s.table_AppUser_Like)
  .where(s.col_userId, userId)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

function deleteLike(userId, articleId) {
  return knex(s.table_AppUser_Like)
  .where(s.col_userId, userId)
  .andWhere(s.col_articleId, articleId)
  .del();
}


// Saves
function selectSaves(userId) {
  return knex
  .select(s.col_articleId + " as " + s.col_id)
  .from(s.table_AppUser_Save)
  .where(s.col_userId, userId)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

function insertSave(userId, articleId) {

  const save = h.createJunctionRowsFrom(s.col_userId, userId, s.col_articleId, [articleId]);
  return knex(s.table_AppUser_Save)
  .insert(save)
  .returning("*");
}

function deleteSave(userId, articleId) {
  return knex(s.table_AppUser_Save)
  .where(s.col_userId, userId)
  .andWhere(s.col_articleId, articleId)
  .del();
}


// Article Follows
function selectArticleFollows(userId) {
  console.log("User id: ", userId);
  return knex
  .select(s.col_articleId + " as " + s.col_id)
  .from(s.table_ArticleFollow)
  .where(s.col_userId, userId)
  .orderBy(s.col_createdAt, s.val_descending)
  .then(h.pluckId);
}

function insertArticleFollow(userId, articleId) {
  console.log("Inserting: ", userId);
  console.log("Article: ", articleId);
  const articleFollow = h.createJunctionRowsFrom(s.col_userId, userId, s.col_articleId, [articleId]);
  return knex(s.table_ArticleFollow)
  .insert(articleFollow)
  .returning("*");
}

function deleteArticleFollow(userId, articleId) {
  return knex(s.table_ArticleFollow)
  .where(s.col_userId, userId)
  .andWhere(s.col_articleId, articleId)
  .del();
}




function agreeCovenant(userId) {
  return knex(s.table_AppUser)
  .update(s.col_covenantAgreed, true)
  .where(s.col_id, userId);
}


/* Get all lx emails */
// function selectAllLeadersExchangeEmails() {
//   return models.LeadersExchangeEmail.findAll();
// }
