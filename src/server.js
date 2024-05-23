require('dotenv').config()

const Hapi = require('@hapi/hapi');

const { loadModel, predict } = require('./inference');
const storeData = require('./storeData');

(async () => {
  // Load the model
  const model = await loadModel();

  const server = Hapi.server({
    host: process.env.NODE_ENV !== 'production' ? 'localhost' : '0.0.0.0',
    port: 3000
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => h.response('Cancer prediction server.').code(200)
  });

  server.route({
    method: 'POST',
    path: '/predict',
    handler: async (request, h) => {
      const { image } = request.payload;

      try {
        // Predict the image
        const predictions = await predict(model, image);
        
        const { nanoid } = await import('nanoid');
        const id = nanoid();

        const label = predictions[0] > 0.5 ? 'Cancer' : 'Non-cancer';
        const data = {
          id,
          result: label,
          suggestion: label === 'Cancer' ? 'Segera periksa ke dokter!' : 'Tidak perlu khawatir',
          createdAt: new Date().toISOString()
        };

        // Store prediction into Firestore
        await storeData(id, data);

        return h.response({
          status: 'success',
          message: 'Model is predicted successfully',
          data
        }).code(201);
      } catch (error) {
        console.error('Prediction error:', error);
        return h.response({
          status: 'fail',
          message: 'Terjadi kesalahan dalam melakukan prediksi'
        }).code(400);
      }
    },
    options: {
      payload: {
        allow: 'multipart/form-data',
        multipart: true,
        maxBytes: 1000000,
        // File size validation
        failAction: (request, h, err) => {
          if (err.output.statusCode === 413) {
            return h.response({
              status: 'fail',
              message: 'Payload content length greater than maximum allowed: 1000000'
            }).code(413).takeover();
          }
          throw err;
        }
      }
    }
  });

  await server.start();

  console.log(`Server started at: ${server.info.uri}`);
})();