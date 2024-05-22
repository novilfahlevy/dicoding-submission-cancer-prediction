const Hapi = require('@hapi/hapi');
const { loadModel, predict } = require('./inference');

(async () => {
  const model = await loadModel();
  console.log('model loaded!');

  const server = Hapi.server({
    host: process.env.NODE_ENV !== 'production' ? 'localhost' : '0.0.0.0',
    port: 3000
  });

  server.route({
    method: 'POST',
    path: '/predicts',
    handler: async (request, h) => {
      const { image } = request.payload;

      // Validate image size
      if (image._data.length > 1000000) {
        return h.response({
          status: 'fail',
          message: 'Payload content length greater than maximum allowed: 1000000'
        }).code(413);
      }

      try {
        const predictions = await predict(model, image);
        
        const { nanoid } = await import('nanoid');
        const id = nanoid();

        const label = predictions[0] > 0.5 ? 'Cancer' : 'Not Cancer';  // Assuming binary classification

        return {
          status: 'success',
          message: 'Model predicted successfully',
          data: {
            id,
            result: label,
            suggestion: label === 'Cancer' ? 'Segera periksa ke dokter!' : 'Tidak perlu khawatir',
            createdAt: new Date().toISOString()
          }
        };
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
        maxBytes: 1000000 // Set maximum payload size
      }
    }
  });

  await server.start();

  console.log(`Server started at: ${server.info.uri}`);
})();