const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const textDiagnoseRoutes = require('./routes/textDiagnose.js');
const imageDiagnoseRoutes = require('./routes/imageDiagnose.js');
const saleRoutes = require('./routes/saleRoutes.js');
const cropRoutes = require('./routes/cropRoutes.js');
const errorHandler = require('./middleware/errorHandler.js');
const authRoutes = require('./routes/authRoutes.js');
const { authenticateJWT } = require('./middleware/authMiddleware.js');
const expenditureRoutes = require('./routes/expenditure.js');
const diseaseRoutes = require('./routes/diseaseRoutes');

const { logger } = require('./logger.js');


const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => logger.info('MongoDB connected', { component: 'database' }));

app.use(helmet());
app.use(cors());


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.use('/api/auth', authRoutes);
app.use('/api/disease', diseaseRoutes); 
app.use('/api/text', textDiagnoseRoutes);
app.use('/api/image', imageDiagnoseRoutes); // Namespace image routes
app.use('/api',  saleRoutes);
app.use('/api', cropRoutes);
app.use('/api', expenditureRoutes);



//app.use('/api', expenditureRoutes);



app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.use(errorHandler);




app.listen(PORT, () => {
  console.log(`🌱 Crop Disease Diagnosis API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;