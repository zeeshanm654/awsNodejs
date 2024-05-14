const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/userroutes');
const cors = require('cors');
const path = require('path');
const port = process.env.PORT || 3000;
const app = express()

const corsOptions = {
  origin: 'https://dashboard.elevatedmarketplace.world/ ',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'authorization'],
};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors(corsOptions));
// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
// Parse JSON bodies
app.use(bodyParser.json());

// Connect routes
app.use('/user/api', apiRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });