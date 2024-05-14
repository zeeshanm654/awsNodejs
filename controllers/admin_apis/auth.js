const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto-js');
const fs = require('fs');
const {CleanHTMLData, CleanDBData } = require('../../config/database/connection')
const transporter = require('../../config/mail/mailconfig')
require('dotenv').config();
const encryptionKey = process.env.KEY
const { Qry,checkAuthorization, randomToken } = require('../../helpers/functions');
const secretKey = process.env.jwtSecretKey;

const backoffice_link = 'https://novalyabackend.threearrowstech.com/';
const weblink = 'https://dashboard.elevatedmarketplace.world/';
const emailImagesLink = 'https://threearrowstech.com/projects/Elevated market place/public/images/email-images/';
const noreply_email = 'noreply@threearrowstech.com';
const company_name = 'Elevated market place';

// Create a multer middleware for handling the file upload 
const upload = multer();


const auth = {

    fetchGroup : async (req, res) => {

        try {
            var user = req.user;
            var body = req.body;
            console.log('user', user);
            const messagesSelect = await Qry(`SELECT * FROM groups WHERE user_id = '${user.id}'`);
  
            if (messagesSelect.length > 0) {
              const messagesArray = { entries: messagesSelect };
              return res.status(200).json({ status: 'success', data: messagesArray });
            } else {
              const messagesArray = { entries: [{ id: 1, type: 'empty', details: 'no new message' }] };
              return res.status(200).json({ status: 'success', data: messagesArray });
            }

        }catch (err) {

            const messagesArray = { entries: [{ id: 1, type: 'empty', details: 'no new message' }] };
            return res.status(200).json({ status: 'success', data: messagesArray });
        }
    },
};

module.exports = auth;
