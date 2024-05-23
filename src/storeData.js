const path = require('node:path');
const { Firestore } = require('@google-cloud/firestore');
 
async function storeData(id, data) {
  const db = new Firestore({
    databaseId: process.env.FIRESTORE_DATABASE_ID,
    keyFilename: path.resolve('serviceaccountkey.json')
  });
 
  const predictCollection = db.collection('predictions');
  return predictCollection.doc(id).set(data);
}
 
module.exports = storeData;