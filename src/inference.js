const tf = require('@tensorflow/tfjs-node');

function loadModel() {
  const modelUrl = process.env.MODEL_URL;
  return tf.loadGraphModel(modelUrl);
}

function predict(model, imageBuffer) {
  const tensor = tf.node
    .decodeJpeg(imageBuffer)
    .resizeNearestNeighbor([224, 224])
    .expandDims()
    .toFloat();
 
  return model.predict(tensor).data();
}

module.exports = { loadModel, predict };