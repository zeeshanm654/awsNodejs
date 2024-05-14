const { OpenSeaStreamClient, Network } = require('@opensea/stream-js');
const { WebSocket } = require('ws');
const express = require('express');
require('dotenv').config();
const bodyParser = require('body-parser');
const { DateTime } = require('luxon');
const apiRoutes = require('./routes/userroutes');
const apiAdminRoutes = require('./routes/adminroutes');
const healivingUserRoutes = require('./routes/healivingUserRoutes');
const healivingAdminRoutes = require('./routes/healivingAdminRoutes');
const axios = require('axios');

const {
  Qry,
  findAvailableSpace,
  weiToEther
} = require("./helpers/functions");
const cors = require('cors');
const path = require('path');
const port = process.env.PORT || 3000;
const app = express()
// Get the current date and time in UTC
const currentUTC = DateTime.utc();
// Create a DateTime object for New York in the 'America/New_York' time zone
const newYorkTime = currentUTC.setZone('America/New_York');
// Format the New York time in the desired format
const todayDate = newYorkTime.toFormat('yyyy-MM-dd HH:mm:ss');


const corsOptions = {
  origin: ['https://dashboard.elevatedmarketplace.world', 'https://adminhub.elevatedmarketplace.world','http://dashboard.elevatedmarketplace.world', 'http://adminhub.elevatedmarketplace.world', 'http://localhost:3000', 'http://localhost:3005'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'authorization'],
};

const collectionName = "savage-dogs-omega-jr"
const collection2 = "wandering-dogs"

const client = new OpenSeaStreamClient({
  token: 'aff9c01cf7a94fef828157b5a2338e52',
  connectOptions: {
    transport: WebSocket
  },
  onError: (e) => {
    console.log(e.message);
  }
});
client.connect();



// client.onItemSold(collectionName, async (postData) => {
//   try {
//     const requests = [];
//       const requestConfig = {method: 'POST', url: 'http://localhost:8000/user/api/nftSaleEventipn',
//         headers: {
//           // Add your headers here
//           'Authorization': 'Bearer shakshkahdasydhioashdasdhsldh', // Example authorization header
//           'Content-Type': 'application/json', // Example content type header
//         },
//         data: postData
//       };
//       requests.push(axios(requestConfig));
//       const responses = await Promise.all(requests);
//         // Handle responses here if needed
//         for (const response of responses) {
//           console.log('Response:', response.data);
//         }
//   } catch (error) {
//     console.log(error);
//   }
// });


// client.onItemSold(collection2, async (postData) => {
//   try {
//     const requests = [];
//       const requestConfig = {method: 'POST', url: 'http://localhost:8000/user/api/nftSaleEventipn',
//         headers: {
//           // Add your headers here
//           'Authorization': 'Bearer shakshkahdasydhioashdasdhsldh', // Example authorization header
//           'Content-Type': 'application/json', // Example content type header
//         },
//         data: postData
//       };
//       requests.push(axios(requestConfig));
//       const responses = await Promise.all(requests);
//         // Handle responses here if needed
//         for (const response of responses) {
//           console.log('Response:', response.data);
//         }
//   } catch (error) {
//     console.log(error);
//   }
// });

// // Wei amount to convert
// const weiAmount = '1000000000000000000'; // 1 Ether in Wei

// // Convert Wei to Ether
// const ethAmount = weiToEther(Number(weiAmount));

// console.log(`Wei: ${weiAmount}`);
// console.log(`Ether: ${ethAmount}`);


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors(corsOptions));
// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));
// Parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));

// Connect routes
app.use('/user/api', apiRoutes);

app.use('/admin/api', apiAdminRoutes);


app.use('/user/healiving/api', healivingUserRoutes);

app.use('/admin/healiving/api', healivingAdminRoutes);


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});