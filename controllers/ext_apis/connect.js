const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto-js');
const fs = require('fs');
const {CleanHTMLData, CleanDBData } = require('../config/database/connection')
const transporter = require('../config/mail/mailconfig')
require('dotenv').config();
const encryptionKey = process.env.KEY
const { Qry,checkAuthorization, randomToken } = require('../helpers/functions');
const secretKey = process.env.jwtSecretKey;

const backoffice_link = 'https://novalyabackend.threearrowstech.com/';
const weblink = 'https://dashboard.elevatedmarketplace.world/';
const emailImagesLink = 'https://threearrowstech.com/projects/Elevated market place/public/images/email-images/';
const noreply_email = 'noreply@threearrowstech.com';
const company_name = 'Elevated market place';

// Create a multer middleware for handling the file upload
const upload = multer();

router.post('/fetch-group', async (req, res) => {
    const authUser = await checkAuthorization(req,res); // Assuming checkAuthorization function checks the authorization token
console.log(authUser)
    if (authUser) {
      const messagesSelect = await Qry(`SELECT * FROM groups WHERE user_id = '${authUser}'`);
  
      if (messagesSelect.length > 0) {
        const messagesArray = { entries: messagesSelect };
        res.status(200).json({ status: 'success', data: messagesArray });
      } else {
        const messagesArray = { entries: [{ id: 1, type: 'empty', details: 'no new message' }] };
        res.status(200).json({ status: 'success', data: messagesArray });
      }
    } else {
      res.status(401).json({ status: 'error', message: 'Invalid User.' });
    }
});

router.post('/segment-message', async (req, res) => {
  const authUser = await checkAuthorization(req,res); // Assuming checkAuthorization function checks the authorization token
console.log(authUser)
  if (authUser) {
    const messagesSelect = await Qry(`SELECT * FROM segment_message WHERE user_id = '${authUser}'`);
    if (messagesSelect.length > 0) {
      const messagesArray = { entries: messagesSelect };
      res.status(200).json({ status: 'success', data: messagesArray });
    } else {
      const messagesArray = { entries: [{ id: 1, type: 'empty', details: 'no new message' }] };
      res.status(200).json({ status: 'success', data: messagesArray });
    }
  } else {
    res.status(401).json({ status: 'error', message: 'Invalid User.' });
  }
});



// Add more routes as needed

module.exports = router;
