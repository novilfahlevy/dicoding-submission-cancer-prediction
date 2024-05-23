const tf = require('@tensorflow/tfjs-node');

function loadModel() {
  const modelUrl = 'https://storage.googleapis.com/cancer-prediction-storage-2305/models/model.json';
  return tf.loadLayersModel(modelUrl);
}

function predict(model, imageBuffer) {
  const tensor = tfjs.node
    .decodeJpeg(imageBuffer)
    .resizeNearestNeighbor([224, 224])
    .expandDims()
    .toFloat();
 
  return model.predict(tensor).data();
}

module.exports = { loadModel, predict };