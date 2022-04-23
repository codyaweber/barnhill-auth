module.exports = {
  // Image upload querystring parameters
  contentImageTypes : [
    'articleCoverRaw',
    'articleCoverTall',
    'articleCoverSquare',
    'categoryBackground',
    'categoryBackgroundRaw',
    'contributorHeadshotRaw',
    'contributorHeadshot',
    'contributorProfileBackgroundRaw',
    'contributorProfileBackground',
    'profileBackgroundImageRaw',
    'profileBackgroundImage',
    'userProfilePhoto'
  ],
  
  contentTypeURLs : {
    articles : 'articles',
    categories : 'categories',
    contributors : 'contributors',
    profileBackgroundImages : 'profile-background-images',
    resourcePacks : 'resource-packs',
    tags : 'tags',
  },
  
  // Paths to folders for each type of image stored in blob storage
  blobPaths : {
    articleCoverRaw : "content/article-covers/raw",
    articleCoverTall : "content/article-covers/tall",
    articleCoverSquare : "content/article-covers/square",
    categoryBackground : "content/category-backgrounds",
    categoryBackgroundRaw : "content/category-backgrounds/raw",
    contributorHeadshotRaw : "content/contributors/headshots/raw",
    contributorHeadshot : "content/contributors/headshots",
    contributorProfileBackgroundRaw : "content/contributors/profile-backgrounds/raw",
    contributorProfileBackground : "content/contributors/profile-backgrounds",
    profileBackgroundImageRaw : "content/profile-background-images/raw",
    profileBackgroundImage : "content/profile-background-images",
    userProfilePhoto : "users/profile-photos"
  },
}
