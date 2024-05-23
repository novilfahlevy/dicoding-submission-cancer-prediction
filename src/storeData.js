const path = require('node:path');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  databaseId: process.env.FIRESTORE_DATABASE_ID,
  keyFilename: path.resolve('serviceaccountkey.json')
});
 
async function storeData(id, data) {
  const predictCollection = db.collection('predictions');
  return predictCollection.doc(id).set(data);
}

async function getPredictionHistories() {
  try {
    const predictCollection = db.collection('predictions');
    const snapshot = await predictCollection.get();

    if (snapshot.empty) {
      console.log('No matching documents.');
      return [];
    }

    const histories = [];
    snapshot.forEach(doc => {
      const data = doc.data()
      histories.push({
        id: data.id,
        history: data,
      });
    });

    return histories;
  } catch (error) {
    console.error('Error getting prediction histories:', error);
    throw new Error('Failed to fetch prediction histories');
  }
}
 
module.exports = { storeData, getPredictionHistories };