/*
Various utility methods
*/

module.exports = {
  upload : {
  
    getBase64FileUpload : async (file) => {
      return new Promise( (fulfill, reject) => {

        let fileString = "";
        
        file.setEncoding('base64');
        file.on("data", (data) => {
          // Convert base64 data in file stream to a base64 string
          const chunk = data.toString();
          fileString += chunk;
        });

        file.on("end", () => {
          fulfill(fileString);
        })
      })
    }
  }
};
