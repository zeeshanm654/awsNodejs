const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const crypto = require("crypto-js");
const fs = require("fs");
const { DateTime } = require('luxon');
const { CleanHTMLData, CleanDBData } = require("../config/database/connection");
const emailTemplate = require("../helpers/emailTemplates/emailTemplates");
const transporter = require("../config/mail/mailconfig");
require("dotenv").config();
const encryptionKey = process.env.KEY;
const axios = require('axios');

const {
  Qry,
  checkAuthorization,
  randomToken,
  findAvailableSpace,
  getBinaryTreeUsers,
  getBinaryTreeUsers1,
  getUserData,
  manualLoginAuthorization,
  binaryCalculation,
  weiToEther,
  getCurrentTime
} = require("../helpers/functions");
const secretKey = process.env.jwtSecretKey;
const nairaprice = process.env.nairaprice
// Get the current date and time in UTC
const currentUTC = DateTime.utc();
// Create a DateTime object for New York in the 'America/New_York' time zone
const newYorkTime = currentUTC.setZone('America/New_York');
// Format the New York time in the desired format


const backoffice_link = "http://localhost:8000/";
const weblink = "https://dashboard.elevatedmarketplace.world/";
const emailImagesLink =
  "https://threearrowstech.com/projects/gdsg/public/images/email-images/";
const noreply_email = "mails@elevatedmarketplace.world";
const company_name = "Elevated market place";
const apiKey = process.env.apiKey

const sdk = require('api')('@opensea/v2.0#3lnme36lrv20d3f');
sdk.auth(apiKey);
sdk.server('https://api.opensea.io')

// Create a multer middleware for handling the file upload
const upload = multer();



// get Products
router.post("/getproduct", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    try {
      const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
      if (authUser) {
        // const getProduct = `SELECT p.*
        // FROM products p
        // WHERE p.id NOT IN (
        //     SELECT od.productid
        //     FROM orderdetails od
        //     WHERE od.userid = ?
        //     AND MONTH(od.createdat) = MONTH(CURRENT_DATE())
        //     AND YEAR(od.createdat) = YEAR(CURRENT_DATE())
        // );`;
        const getProduct = `SELECT *
        FROM products`;
        const ProductData = await Qry(getProduct, [authUser]);
        const imageURL = `${backoffice_link}uploads/products/`;
        res.json({
          status: "success",
          data: ProductData,
          imageURL: imageURL,
        });
      }
    } catch (error) {
      console.log("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  //za Add Order
  
  
  router.post("/getorderhistory", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    try {
      const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the 
      if (authUser) {
        const getOrderHistory = `SELECT up.*,  st.storename,st.address,st.mobile  from userpackages up 
        left join usersdata st on st.id = up.stockistid
        where up.userid = ? and type = ?`;
        const orderHistoryData = await Qry(getOrderHistory, [authUser,'products']);
        res.json({
          status: "success",
          data: orderHistoryData,
        });
      }
    } catch (error) {
      console.log("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  // za order details
  router.post("/getorderdetails", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    try {
      const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
      if (authUser) {
        const orderid = CleanHTMLData(CleanDBData(req.body.orderid));
        const ordersQuery = `SELECT 
        orderdetails.quantity, 
        products.title,     
        products.price,     
        products.picture 
    FROM 
        orderdetails 
    JOIN 
        products ON orderdetails.productid = products.id 
    WHERE
        orderdetails.orderid = ?`;
  
        const ordersData = await Qry(ordersQuery, [orderid]);
  
        res.json({
          status: "success",
          data: ordersData,
        });
      }
    } catch (error) {
      console.log("Error executing queries:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
module.exports = router;

