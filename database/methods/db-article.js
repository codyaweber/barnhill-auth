/*
Database operations for articles
*/

"use strict";

const root = require("rootrequire");
const s = require(root + "/resource/statics/sql");
const h = require(root + "/database/methods/support/helpers");
const dbContributor = require(root + "/database/methods/db-contributor");
const knex = require(root + "/database/knex/setup");

module.exports = {
  insertFullArticle,
  updateFullArticle,
  deleteArticle,
  selectAllIds,
  selectIdsPaginated,
  selectById,
  selectIdsByCategory,
  selectIdsByContributor,
  selectIdsByTag,
  selectIdsByResourcePackId,
  selectFollowerIds,
  selectScheduled,
  selectLikes,
  selectIdsBySearch,
  standard : {
    // selectHome handled by selectIdsByCategory
    //selectFaves is in db-user
    //follows handled by selectIdsByContributor
    selectLatest,
    selectByTagName // featured & testimonies
  }
}

// Insert article (and all associated data)
function insertFullArticle(article) {
  
  const tagIds = h.pop("tagIds", article);
  const contributorIds = h.pop("contributorIds", article);
  const categoryIds = h.pop("categoryIds", article);

  //Store article row that gets created in this scope
  let insertedArticle;

  return knex.transaction( (transaction) => {

    return insert(article, transaction)
    .then(result => {
      insertedArticle = result;
      return insertArticleJunctionData(insertedArticle[s.col_id], categoryIds, contributorIds, tagIds, transaction);
    })
    .then( ([tagIds, contributorIds, categoryIds]) => {
      insertedArticle.categoryIds = categoryIds;
      insertedArticle.contributorIds = contributorIds;
      insertedArticle.tagIds = tagIds;
      return insertedArticle;
    })
  })
  .catch(err => {
    //Transaction failed, data rolled back
    console.log("Article insertion failed. Transaction was rolled back.");
    throw err;
  });
}

// Update article by id (and all associated data)
function updateFullArticle(article) {
  const tagIds = h.pop("tagIds", article);
  const contributorIds = h.pop("contributorIds", article);
  const categoryIds = h.pop("categoryIds", article);

  let updatedArticle;

  return knex.transaction( (transaction) => {
    return update(article, transaction)
    .then(result => {
      if(result === undefined) {
        return undefined;
      }

      updatedArticle = result;

      return insertArticleJunctionData(updatedArticle[s.col_id], categoryIds, contributorIds, tagIds, transaction)
      .then( ([categoryIds, contributorIds, tagIds]) => {
        updatedArticle.categoryIds = categoryIds;
        updatedArticle.contributorIds = contributorIds;
        updatedArticle.tagIds = tagIds;
        return updatedArticle;
      })
      .catch(err => {
        console.log("Insert article junction data error: ", err);
      })
    })
    .catch(err => {
      console.log("Update error: ", err);
    })
  })
  .catch(err => {
    //Transaction failed, data rolled back
    console.log("Article update failed. Transaction was rolled back.");
    throw err;
  });
}
// Delete article by id (and all associated data)
function deleteArticle(id) {
  return knex.transaction( (transaction) => {
    return deleteArticleContributors(id, transaction)
    .then(result => {
      return deleteArticleCategories(id, transaction);
    })
    .then(result => {
      return deleteArticleTags(id, transaction);
    })
    .then(result => {
      return del(id, transaction);
    })
  })
  .catch(err => {
    //Transaction failed, data rolled back
    console.log("Article deletion failed. Transaction was rolled back.");
    throw err;
  });
}


/* Get ids of all articles */
async function selectAllIds(includeScheduled = false) {

  const parameters = [
    // select
    s.col_id,
    // from 
    s.table_Article
  ]
  
  let query = `select ?? from ??`;
  
  if(!includeScheduled) {
    parameters.push(...[
      // a.
      s.col_publishAt,
      // < 
      new Date()
    ]);
    query = `${query} where ?? < ?`;
  }
  
  parameters.push(...[
    // order by
    s.col_publishAt,
    // desc
  ]);
  
  query = `${query} order by ?? ${s.val_descending}`
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

/* Select ids of articles with limit and offset parameters */
async function selectIdsPaginated(offset, limit, includeScheduled = false) {
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_Article
  ];
  
  let query = `SELECT ?? FROM ??`;
  
  if(!includeScheduled) {
    parameters.push(...[
      // a.
      s.col_publishAt,
      // < 
      new Date()
    ]);
    query = `${query} where ?? < ?`;
  }
  
  parameters.push(...[
    // ORDER BY
    s.col_publishAt,
    // DESC OFFSET
    parseInt(offset),
    // ROWS FETCH NEXT
    parseInt(limit)
    // ROWS ONLY
  ])
  
  query = `${query} ORDER BY ?? DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY;`
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

/* Get single article by id */
async function selectById(id, includeScheduled = false) {

  const select = ["*"];
  const from = [s.table_Article];
  const where = [
    s.col_id,
    id
  ];
  
  const parameters = [
    // select
    '*',
    // from
    s.table_Article,
    // where
    s.col_id,
    // = 
    id
    // and
    // s.col_publishAt
    // <
    // 
  ];
  
  let query = "SELECT ?? FROM ?? WHERE ?? = ?";
  
  if(!includeScheduled) {
    parameters.push(...[s.col_publishAt, new Date()]);
    query = `${query} AND ?? < ?`;
  }

  const article = await knex.raw(query, parameters).then(h.first);
  if(article === null) {
    return null;
  }

  const [categories, contributors, tags] = await Promise.all([
    selectArticleCategoryIds(id),
    selectArticleContributorIds(id),
    selectArticleTagIds(id)
  ]);

  article.categoryIds = categories;
  article.contributorIds = contributors;
  article.tagIds = tags;

  return article;
}


function selectArticleCategoryIds(articleId) {
  const select = [
    s.col_categoryId
  ];
  const from = [
    s.table_Article_Category
  ];
  const where = [
    s.col_articleId,
    articleId
  ];
  
  const parameters = select.concat(from, where);
  const query = "SELECT ?? FROM ?? WHERE ?? = ?;"
  return knex.raw(query, parameters)
  .then(ids => h.pluckId(ids, s.col_categoryId));
}

function selectArticleTagIds(articleId) {
  const select = [
    s.col_tagId
  ];
  const from = [
    s.table_Article_Tag
  ];
  const where = [
    s.col_articleId,
    articleId
  ];
  const parameters = select.concat(from, where);
  const query = "SELECT ?? FROM ?? WHERE ?? = ?;"
  return knex.raw(query, parameters)
  .then(ids => h.pluckId(ids, s.col_tagId));
}

function selectArticleContributorIds(articleId) {
  const select = [
    s.col_contributorId
  ];
  const from = [
    s.table_Article_Contributor
  ];
  const where = [
    s.col_articleId,
    articleId
  ];
  const parameters = select.concat(from, where);
  const query = "SELECT ?? FROM ?? WHERE ?? = ?;"
  return knex.raw(query, parameters)
  .then(ids => h.pluckId(ids, s.col_contributorId));
}

/* Fetch article ids with category ids
  strict parameter decides AND vs OR; true === AND, false === OR */
function selectIdsByCategory(categoryIds, strict = false, includeScheduled = false) {
  // 
  // SELECT articleId
  // FROM (
  //   SELECT articleId, categoryId, publishAt
  //   FROM Article_Category ac
  // 
  //   JOIN Article a ON a.id = ac.articleId // Conditionally included
  // 
  //   WHERE categoryId IN (26, 27, 28, 29)
  // 
  //   AND a.publishAt < CURRENT_TIMESTAMP // Conditionally included
  // 
  //   GROUP BY articleId, categoryId, publishAt
  // ) AS G
  // GROUP BY G.articleId, G.publishAt
  // HAVING Count(*) = 4
  // ORDER BY publishAt DESC
  
  const parameters = [
    // select
    s.col_articleId,
    // as
    s.col_id,
    // from (
      // select
      s.col_articleId,
      s.col_categoryId,
      s.col_publishAt,
      // from
      s.table_Article_Category,
      // ac join
      s.table_Article, 
      // a on a.
      s.col_id,
      // = ac.
      s.col_articleId,
      // where
      s.col_categoryId,
      // in
      ...categoryIds,
  ];
  
  const inCategoryIdStr = h.getKnexInParamStringFromArray(categoryIds);
  let query = `select ?? as ?? from (select ??, ??, ?? from ?? ac join ?? a on a.?? = ac.??
               where ac.?? in ${inCategoryIdStr}`;
  
  if(!includeScheduled) {
    parameters.push(...[
      // a.
      s.col_publishAt,
      // < 
      new Date()
    ]);
    query = `${query} and a.?? < ?`;
  }
  
  parameters.push(...[
      // group by
      s.col_articleId,
      s.col_categoryId,
      s.col_publishAt,
    // ) as G
    // group by g.
    s.col_articleId,
    s.col_publishAt,
    // having count(
    "*",
  ]);
  
  query = `${query} group by ??, ??, ??) as G group by G.??, G.?? having count(??)`;
  
  if(strict) {
    // Strict - AND query
    parameters.push(...[
      // =
      categoryIds.length,
    ])
    
    query = `${query} = ?`
  } else {
    // Not strict - OR query
    parameters.push(...[
      // >
      0
    ])
    
    query = `${query} > ?`
  }
  
  parameters.push(...[
    // order by
    s.col_publishAt,
    // s.val_descending - in query string
  ]);
  
  query = `${query} order by ?? ${s.val_descending}`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId)
}

/* Fetch article ids where contributorId 
  strict parameter decides AND vs OR; true === AND, false === OR */
function selectIdsByContributor(contributorIds, strict = false, includeScheduled = false) {
  
  // SELECT articleId
  // FROM (
  //   SELECT articleId, contributorId, publishAt
  //   FROM Article_Contributor ac
  
  //   JOIN Article a ON a.id = ac.articleId // Conditionally included
  
  //   WHERE contributorId IN (26, 27, 28, 29)
  
  //   AND a.publishAt < CURRENT_TIMESTAMP // Conditionally included
  
  //   GROUP BY articleId, contributorId, publishAt
  // ) AS G
  // GROUP BY G.articleId, G.publishAt
  // HAVING Count(*) = 4
  // ORDER BY publishAt DESC
  
  const parameters = [
    // select
    s.col_articleId,
    // as
    s.col_id,
    // from (
      // select
      s.col_articleId,
      s.col_contributorId,
      s.col_publishAt,
      // from
      s.table_Article_Contributor,
      // ac join
      s.table_Article, 
      // a on a.
      s.col_id,
      // = ac.
      s.col_articleId,
      // where
      s.col_contributorId,
      // in
      ...contributorIds,
  ];
  
  const inContributorIdsStr = h.getKnexInParamStringFromArray(contributorIds);
  let query = `select ?? as ?? from (select ??, ??, ?? from ?? ac join ?? a on a.?? = ac.??
               where ac.?? in ${inContributorIdsStr}`;
  
  if(!includeScheduled) {
    parameters.push(...[
      // a.
      s.col_publishAt, 
      // < 
      new Date()
    ]);
    query = `${query} and a.?? < ?`;
  }
  parameters.push(...[
      // group by
      s.col_articleId,
      s.col_contributorId,
      s.col_publishAt,
    // ) as G
    // group by g.
    s.col_articleId,
    s.col_publishAt,
    // having count(
    "*",
  ]);
  
  query = `${query} group by ??, ??, ??) as G group by G.??, G.?? having count(??)`;
  
  if(strict) {
    // Strict - AND query
    parameters.push(...[
      // =
      contributorIds.length,
    ])
    
    query = `${query} = ?`
  } else {
    // Not strict - OR query
    parameters.push(...[
      // >
      0
    ])
    
    query = `${query} > ?`
  }
  
  parameters.push(...[
    // order by
    s.col_publishAt,
    // s.val_descending - in query string
  ]);
  
  query = `${query} order by ?? ${s.val_descending}`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

/* Fetch article ids with tags (AND, not OR) 
  strict parameter decides AND vs OR; true === AND, false === OR */
function selectIdsByTag(tagIds, strict = false, includeScheduled = false) {
  // SELECT articleId
  // FROM (
  //   SELECT articleId, tagId, publishAt
  //   FROM Article_Tag art
  // 
  //   JOIN Article a ON a.id = art.articleId // Conditionally included
  // 
  //   WHERE tagId IN (26, 27, 28, 29)
  // 
  //   AND a.publishAt < CURRENT_TIMESTAMP // Conditionally included
  // 
  //   GROUP BY articleId, tagId, publishAt
  // ) AS G
  // GROUP BY G.articleId, G.publishAt
  // HAVING Count(*) = 4
  // ORDER BY publishAt DESC
  
  const parameters = [
    // select
    s.col_articleId,
    // as
    s.col_id,
    // from (
      // select
      s.col_articleId,
      s.col_tagId,
      s.col_publishAt,
      // from
      s.table_Article_Tag,
      // art join
      s.table_Article, 
      // a on a.
      s.col_id,
      // = art.
      s.col_articleId,
      // where
      s.col_tagId,
      // in
      ...tagIds,
  ];
  
  const inTagIdsStr = h.getKnexInParamStringFromArray(tagIds);
  let query = `select ?? as ?? from (select ??, ??, ?? from ?? art join ?? a on a.?? = art.??
               where art.?? in ${inTagIdsStr}`;
  
  if(!includeScheduled) {
    parameters.push(...[
      // a.
      s.col_publishAt, 
      // < 
      new Date()
    ]);
    query = `${query} and a.?? < ?`;
  }
  
  parameters.push(...[
      // group by
      s.col_articleId,
      s.col_tagId,
      s.col_publishAt,
    // ) as G
    // group by g.
    s.col_articleId,
    s.col_publishAt,
    // having count(
    "*",
  ]);
  
  query = `${query} group by ??, ??, ??) as G group by G.??, G.?? having count(??)`;
  
  if(strict) {
    // Strict - AND query
    parameters.push(...[
      // =
      tagIds.length,
    ])
    
    query = `${query} = ?`
  } else {
    // Not strict - OR query
    parameters.push(...[
      // >
      0
    ])
    
    query = `${query} > ?`
  }
  
  parameters.push(...[
    // order by
    s.col_publishAt,
    // s.val_descending - in query string
  ]);
  
  query = `${query} order by ?? ${s.val_descending}`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

/* Fetch article ids where resourcePackId */
function selectIdsByResourcePackId(resourcePackId, includeScheduled) {

  const parameters = [
    // select
    s.col_id,
    // from
    s.table_Article,
    // where
    s.col_resourcePackId,
    // =
    resourcePackId
  ];
  
  let query = "SELECT ?? FROM ?? WHERE ?? = ?";
  
  if(!includeScheduled) {
    parameters.push(...[
      // and
      s.col_publishAt,
      // <
      new Date()
    ])
    query = `${query} and ?? < ?`
  }
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

// Fetch ids of all users following articleId
function selectFollowerIds(articleId) {
  return knex.select(s.col_userId + " AS " + s.col_id)
  .from(s.table_ArticleFollow)
  .where(s.col_articleId, articleId)
  .then(h.pluckId);
}

function selectScheduled() {
  // select a.id from Article a where a.publishAt > CURRENT_TIMESTAMP;
  const parameters = [
    // select a.
    s.col_id,
    // from 
    s.table_Article,
    // a where a.
    s.col_publishAt,
    // >
    new Date()
  ];
  
  const query = `select ?? from ?? where ?? > ?`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

/* Select ids of all users who have liked articleId */
function selectLikes(articleId, includeScheduled) {
  
  const parameters = [
    // select aul.
    s.col_userId,
    // as 
    s.col_id,
    // from 
    s.table_AppUser_Like,
    // aul join
    s.table_Article,
    // a on a.
    s.col_id,
    // = aul.
    s.col_articleId,
    // where aul.
    s.col_articleId,
    // = 
    articleId
  ];
  
  let query = "select ?? as ?? from ?? aul join ?? a on a.?? = aul.?? where aul.?? = ?";
  
  if(!includeScheduled) {
    parameters.push(...[
      // and
      s.col_publishAt,
      // <
      new Date()
    ])
    query = `${query} and a.?? < ?`
  }
  
  parameters.push(...[
    // order by aul.
    s.col_createdAt,
    // desc
  ]);
  
  query = `${query} order by aul.?? ${s.val_descending}`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
  
  
  // select aul.userId as id from AppUser_Like aul
  // join Article a on a.id = aul.articleId 
  // where aul.articleId = 91
  // --and publishAt < CURRENT_TIMESTAMP 
  // order by aul.createdAt desc;
}

/* Get ids of articles that match the set of search criteria */
function selectIdsBySearch(criteria) {

  const promises = getArticlePromisesFromSearchCriteria(criteria);
  if(promises.length === 0) {
    const err = {
      "error" : "invalid_input",
      "message" : "No parameters specified."
    };
    return Promise.reject(err);
  }

  return Promise.all(promises)
  .then(getCommonElements)
  .then(arr => {
    return arr.reverse();
  })
}


// Query distinct article ids by date (recent first)
function selectLatest(includeScheduled = false) {
  
  const parameters = [
    // select a.
    s.col_id,
    // from
    s.table_Article  
  ];
  
  let query = `select a.?? from ?? a`;
  
  if(!includeScheduled) {
    parameters.push(...[
      // where a
      s.col_publishAt,
      // <
      new Date()
    ]);
    
    query = `${query} where ?? < ?`;
  }
  
  parameters.push(...[
    // order by a.
    s.col_publishAt,
    // desc
  ])
  
  query = `${query} order by a.?? ${s.val_descending}`;
  
  return knex.raw(query, parameters)
  .then(h.pluckId);
}


// Query articles by tag name
function selectByTagName(tagName, includeScheduled = false) {
   
  return knex.select(s.col_id)
  .from(s.table_Tag)
  .where(s.col_title, tagName)
  .then(h.pluckId)
  .then( tagId => {
    return selectIdsByTag(tagId, includeScheduled);
  })
}









/*
Un-exported helper methods
*/

// Insert article (without junction data) (within knex transaction)
function insert(article, transaction) {
  article[s.col_niceTitle] = article[s.col_title].replace(/\s+/g, '').toLowerCase();

  article[s.col_createdAt] = h.getTimestamp();
  article[s.col_updatedAt] = h.getTimestamp();

  return knex(s.table_Article)
  .transacting(transaction)
  .returning("*")
  .insert(article)
  .then(h.first);
}
// Update article (without junction data) (within knex transaction)
function update(article, transaction) {
  article[s.col_niceTitle] = article[s.col_title].replace(/\s+/g, '').toLowerCase();
  article[s.col_updatedAt] = h.getTimestamp();

  const id = h.pop(s.col_id, article);

  return knex(s.table_Article)
  .transacting(transaction)
  .where({ [s.col_id] : id })
  .returning("*")
  .update(article)
  .then(h.first);
}
// Insert categoryIds corresponding to articleId (within knex transaction)
function insertArticleCategories(articleId, categoryIds, transaction) {
  return deleteArticleCategories(articleId, transaction)
  .then(numRows => {
    const newRows = createArticleJunctionTableRow(articleId, categoryIds, s.col_categoryId);

    return knex(s.table_Article_Category)
    .transacting(transaction)
    .returning([s.col_categoryId])
    .insert(newRows)
  })
}
// Insert contributorIds corresponding to articleId (within knex transaction)
function insertArticleContributors(articleId, contributorIds, transaction) {
  return deleteArticleContributors(articleId, transaction)
  .then(numRows => {
    const newRows = createArticleJunctionTableRow(articleId, contributorIds, s.col_contributorId);

    return knex(s.table_Article_Contributor)
    .transacting(transaction)
    .returning([s.col_contributorId])
    .insert(newRows)
  })
}
// Insert tagIds corresponding to articleId (within knex transaction)
function insertArticleTags(articleId, tagIds, transaction) {
  return deleteArticleTags(articleId, transaction)
  .then(numRows => {
    const newRows = createArticleJunctionTableRow(articleId, tagIds, s.col_tagId)

    return knex(s.table_Article_Tag)
    .transacting(transaction)
    .returning([s.col_tagId])
    .insert(newRows)
  })
}
// Use provided articleId and foreign key ids to create rows to be inserted
// into and Article junction table, i.e. Article_Tag, Article_Contributor, etc.
function createArticleJunctionTableRow(articleId, foreignKeyIds, foreignKey) {
  const createdAt = h.getTimestamp();
  const updatedAt = createdAt;

  return foreignKeyIds.map(fkId => {
    return {
      [s.col_createdAt] : createdAt,
      [s.col_updatedAt] : updatedAt,
      [s.col_articleId] : articleId,
      [foreignKey] : fkId
    }
  })
}
// Insert categories, contributors and tags corresponding to articleId
// into junction tables (within knex transaction)
function insertArticleJunctionData(articleId, categoryIds, contributorIds, tagIds, transaction) {

  let resultCategories;
  let resultContributors;
  let resultTags;


  return insertArticleCategories(articleId, categoryIds, transaction)
  .then(result => {
    resultCategories = result;
    return insertArticleContributors(articleId, contributorIds, transaction)
  })
  .then(result => {
    resultContributors = result;
    return insertArticleTags(articleId, tagIds, transaction);
  })
  .then(result => {
    resultTags = result;
    return [resultCategories, resultContributors, resultTags];
  })
}


// Select article with id from Article table (no junction data)
// function selectArticleId(id) {
//   return knex.select("*")
//   .from(s.table_Article)
//   .where({ [s.col_id] : id });
// }

function selectArticleCategories(articleId) {
  return knex.select("*")
  .from(s.table_Article_Category)
  .where(s.col_articleId, articleId);
}

function selectArticleContributors(articleId) {
  return knex.select("*")
  .from(s.table_Article_Contributor)
  .where(s.col_articleId, articleId);
}

function selectArticleTags(articleId) {
  return knex.select("*")
  .from(s.table_Article_Tag)
  .where(s.col_articleId, articleId);
}

// Delete article (without junction data) (within knex transaction)
function del(articleId, transaction) {
  return knex(s.table_Article)
  .transacting(transaction)
  .where({ [s.col_id] : articleId })
  .del()
}
// Delete all categories corresponding to articleId (within knex transaction)
function deleteArticleCategories(articleId, transaction) {
  return knex(s.table_Article_Category)
  .transacting(transaction)
  .where(s.col_articleId, articleId)
  .del();
}
// Delete all contributors corresponding to articleId (within knex transaction)
function deleteArticleContributors(articleId, transaction) {
  return knex(s.table_Article_Contributor)
  .transacting(transaction)
  .where(s.col_articleId, articleId)
  .del();
}
// Delete all tags corresponding to articleId (within knex transaction)
function deleteArticleTags(articleId, transaction) {
  return knex(s.table_Article_Tag)
  .transacting(transaction)
  .where(s.col_articleId, articleId)
  .del();
}


// Given search criteria, return array of promises that resolve
// to search results
function getArticlePromisesFromSearchCriteria(criteria) {
  const articleWhereClause = whereClauseFromSearchCriteria(criteria);
  const {parameters, whereQuery} = articleWhereClause;
  
  const promises = [];
  
  // If there are no conditions specified for articleWhereClause
  if(articleWhereClause.parameters.length !== 0) {
    promises.push(searchArticlesWithWhereClause(whereQuery, parameters));
  }
  
  const strict = true;
  const includeScheduled = criteria.includeScheduled === '1';

  if(criteria.contributor) {
    // Get articles by contributorId; this method takes an array, but search query only
    // takes one contributor, so wrap contributor in an array
    promises.push(selectIdsByContributor([criteria.contributor], strict, includeScheduled));
  }
  
  if(criteria.categories) {
    // Get articles by categoryIds
    promises.push(selectIdsByCategory(criteria.categories, strict, includeScheduled));
  }
  
  if(criteria.tags) {
    // Get articles by tagIds
    promises.push(selectIdsByTag(criteria.tags, strict, includeScheduled));
  }

  return promises;
}

/* Return article ids filtered by where clause */
function searchArticlesWithWhereClause(whereQuery, whereParameters) {
  console.log("Where query: ", whereQuery);
  console.log("Where parameters: ", whereParameters);
  
  const parameters = [
    // SELECT
    s.col_id,
    // FROM
    s.table_Article,
    // WHERE
    ...whereParameters,
    // ORDER BY
    s.col_publishAt,
    // DESC
    // s.val_descending This one is hard coded in query
  ];
  
  const query = "SELECT ?? FROM ?? WHERE " + whereQuery + 
  " ORDER BY ?? " + s.val_descending;
  
  console.log("Query: ", query);
  console.log("Parameters: ", parameters);
  return knex.raw(query, parameters)
  .then(h.pluckId);
}

// Takes and array of arrays of integers and returns common elements between
// all arrays
function getCommonElements(arrays) {
  var currentValues = {};
  var commonValues = {};
  for (var i = arrays[0].length-1; i >=0; i--){//Iterating backwards for efficiency
    currentValues[arrays[0][i]] = 1; //Doesn't really matter what we set it to
  }
  for (var i = arrays.length-1; i>0; i--){
    var currentArray = arrays[i];
    for (var j = currentArray.length-1; j >=0; j--){
      if (currentArray[j] in currentValues){
        commonValues[currentArray[j]] = 1; //Once again, the `1` doesn't matter
      }
    }
    currentValues = commonValues;
    commonValues = {};
  }

  return Object.keys(currentValues).map(function(value){
    return parseInt(value);
  });
}

/** Return knex parameters and where clause (string) for article search criteria */
function whereClauseFromSearchCriteria(criteria) {
  let parameters = []
  let where = "";
  
  // Track whether or not the where string is empty, or is being appended to
  let appending = false;
  
  if(criteria.titleText !== undefined) {
    if(appending) {
      where += ` AND `;
    }
    parameters.push(s.col_niceTitle);
    // Hard coding titleText into query; couldn't get it to work with '?' binding
    where += `?? LIKE '%${criteria.titleText}%'`;
    appending = true;
  }

  // Since article's videoIdentifier exists, or is null, only a true value here matters
  if(criteria.isVideo !== undefined) {
    // Query parameters arrive as strings, so "true" is tested instead
    // of true. 0 and 1 arrive as strings as well.
    if(criteria.isVideo === "true" ||
      criteria.isVideo === "1") {
        if(appending) {
          where += ` AND `;
        }
        parameters.push(s.col_videoIdentifier);
        where += `?? IS NOT NULL`;
    }

    if(criteria.isVideo === "false" ||
      criteria.isVideo === "0") {
        if(appending) {
          where += ` AND `;
        }
        parameters.push(s.col_videoIdentifier);
        where += `?? IS NULL`;
    }
    
    appending = true;
  }

  if(criteria.isAudio !== undefined) {
    // Query parameters arrive as strings, so "true" is tested instead
    // of true. 0 and 1 arrive as strings as well.
    if(criteria.isAudio === "true" ||
      criteria.isAudio === "1") {
        if(appending) {
          where += ` AND `;
        }
        parameters.push(s.col_audioIdentifier);
        where += `?? IS NOT NULL`;
    }

    if(criteria.isAudio === "false" ||
      criteria.isAudio === "0") {
        if(appending) {
          where += ` AND `;
        }
        parameters.push(s.col_audioIdentifier);
        where += `?? IS NULL`;
    }
    
    appending = true;
  }

  if(criteria.after !== undefined) {
    if(appending) {
      where += ` AND `;
    }
    parameters.push(s.col_publishAt, criteria.after);
    where += `?? > ?`;
    appending = true;
  }

  if(criteria.before != undefined) {
    if(appending) {
      where += ` AND `;
    }
    parameters.push(s.col_publishAt, criteria.before);
    where += `?? < ?`;
    appending = true;
  }

  if(criteria.resourcePack != undefined) {
    if(appending) {
      where += ` AND `;
    }
    parameters.push(s.col_resourcePackId, criteria.resourcePack);
    where += `?? = ?`
    appending = true;
  }
  
  if(criteria.includeScheduled !== '1') {
    if(appending) {
      where += ` AND `;
    }
    parameters.push(s.col_publishAt, new Date());
    where += `?? < ?`
    appending = true;
  }

  return {
    parameters : parameters,
    whereQuery : where
  };
}
