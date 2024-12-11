require('dotenv').config();

const Hapi = require('@hapi/hapi');
const { loadModel, predict } = require('./inference');
const { storeData, getPredictionHistories } = require('./storeData');

(async () => {
  // Muat model prediksi
  const predictionModel = await loadModel();

  const server = Hapi.server({
    host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost',
    port: process.env.PORT || 8080,
    routes: {
      cors: {
        origin: ['*'], // Izinkan semua domain
        headers: ['Accept', 'Content-Type', 'Authorization'], // Header yang didukung
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'], // Header yang diungkapkan
        additionalExposedHeaders: ['X-Response-Time'], // Header tambahan
        maxAge: 60, // Durasi cache
        credentials: true // Izinkan cookie dan autentikasi
      }
    }
  });

  // Rute dasar untuk memeriksa status server
  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => h.response('Server prediksi kanker aktif.').code(200)
  });

  // Rute untuk prediksi gambar
  server.route({
    method: 'POST',
    path: '/predict',
    handler: async (request, h) => {
      const { image } = request.payload;

      try {
        // Lakukan prediksi
        const predictionResult = await predict(predictionModel, image);

        // Hasilkan ID unik
        const { nanoid } = await import('nanoid');
        const predictionId = nanoid();

        // Tentukan label prediksi
        const label = predictionResult[0] > 0.5 ? 'Cancer' : 'Non-cancer';
        const responsePayload = {
          id: predictionId,
          result: label,
          suggestion: label === 'Cancer' ? 'Segera periksa ke dokter!' : 'Penyakit kanker tidak terdeteksi.',
          createdAt: new Date().toISOString()
        };

        // Simpan data prediksi ke Firestore
        await storeData(predictionId, responsePayload);

        return h.response({
          status: 'success',
          message: 'Model is predicted successfully',
          data: responsePayload
        }).code(201);
      } catch (error) {
        console.error('Kesalahan prediksi:', error);
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
        maxBytes: 1_000_000, // Batas ukuran 1 MB
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

  // Rute untuk mengambil riwayat prediksi
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
        console.error('Kesalahan saat mengambil histori prediksi:', error);
        return h.response({
          status: 'fail',
          message: 'Terjadi kesalahan dalam mengambil data histori prediksi.'
        }).code(500);
      }
    }
  });

  // Jalankan server
  await server.start();
  console.log(`Server berjalan pada: ${server.info.uri}`);
})();