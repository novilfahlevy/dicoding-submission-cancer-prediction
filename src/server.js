require('dotenv').config()

const Hapi = require('@hapi/hapi');

const { loadModel, predict } = require('./inference');
const { storeData, getPredictionHistories } = require('./storeData');

(async () => {
  // Load the model
  const model = await loadModel();

  const server = Hapi.server({
    host: process.env.NODE_ENV !== 'production' ? 'localhost' : '0.0.0.0',
    port: 3000,
    routes: {
      cors: {
        origin: ['*'], // Allow all origins
        headers: ['Accept', 'Content-Type', 'Authorization'], // Allowed headers
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'], // Expose headers
        additionalExposedHeaders: ['X-Response-Time'], // Additional exposed headers
        maxAge: 60,
        credentials: true // Allow credentials
      }
    }
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

  server.route({
    method: 'GET',
    path: '/predict/histories',
    handler: async (request, h) => {
      try {
        const histories = await getPredictionHistories();
        return h.response({
          status: 'success',
          data: histories
        }).code(200);
      } catch (error) {
        console.error('Error fetching prediction histories:', error);
        return h.response({
          status: 'fail',
          message: 'Terjadi kesalahan dalam mengambil data histori prediksi'
        }).code(500);
      }
    }
  });

  await server.start();

  console.log(`Server started at: ${server.info.uri}`);
})();