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
//const { default: axios } = require('axios');

//const { chromium }=require('playwright') 

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




// async function scrapeTextFromUrl(url) {
//   try {
//     const browser = await chromium.launch({
//       headless: false, // Set to false to mimic real browser and debug
//       args: [
//         '--disable-blink-features=AutomationControlled',
//         '--start-maximized',
//       ],
//     });

//     const context = await browser.newContext({
//       userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36',
//       javaScriptEnabled: true,
//       viewport: null,
//     });

//     const page = await context.newPage();

//     // Go to the page
//     await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

//     // Wait for article or body to load
//     await page.waitForSelector('body', { timeout: 10000 });

//     // Get clean visible text
//     const content = await page.$eval('body', el => el.innerText);

//     await browser.close();
//     return content;
//   } catch (err) {
//     console.error('Scraping failed:', err.message);
//     return 'Unable to scrape content due to bot protection.';
//   }
// }



// app.get('/scrape', async (req, res) => {
//   const { url } = req.query;
//   if (!url) {
//     return res.status(400).json({ error: 'Missing ?url= parameter' });
//   }

//   try {
//     const cleanText = await scrapeTextFromUrl(url);
//     res.json({ url, text: cleanText.slice(0, 80000) }); 
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ error: 'Failed to scrape the page' });
//   }
// });

app.use('/api/notifications', require('./routes/notificationRoutes.js'));
app.use('/api/analytics', require('./routes/analytics'));
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