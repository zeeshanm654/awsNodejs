const express = require("express");
const forever = require("forever");
const app = express();
const multer = require("multer");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto-js");
const fs = require("fs");
const { CleanHTMLData, CleanDBData } = require("../config/database/connection");
const transporter = require("../config/mail/mailconfig");
const emailTemplate = require("../helpers/emailTemplates/emailTemplates");

require("dotenv").config();
const encryptionKey = process.env.KEY;
const {
  Qry,
  randomToken,
  settings_data,
  adminAuthorization,
  getBinaryTreeUsers,
  getUserData,
  getCurrentTime
} = require("../helpers/functions");
const { log } = require("console");
const secretKey = process.env.jwtSecretKey;


const backoffice_link = "http://localhost:8000/";
const weblink = "https://dashboard.elevatedmarketplace.world/";
const emailImagesLink =
  "https://threearrowstech.com/projects/gdsg/public/images/email-images/";
const noreply_email = "mails@elevatedmarketplace.world";
const company_name = "Elevated market place";

// Create a multer middleware for handling the file upload
const upload = multer();

// productRoutes


router.post("/getorderhistory", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the 
      if (authUser) {
        const getOrderHistory = `SELECT o.*,  st.storename,st.address,st.mobile,st.username as stockistname from orders o 
        left join usersdata st on st.id = o.stockistid`;
        const orderHistoryData = await Qry(getOrderHistory);
        res.json({
          status: "success",
          data: orderHistoryData,
        });
      }
    } catch (error) {
      console.error("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  // update order status
  
  router.post("/updateorderstatus", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        // Define the orderstatus values for pending and approved orders
        const orderstatus = CleanHTMLData(CleanDBData(req.body.orderstatus)); // Assuming it's a valid status value
        const orderId = CleanHTMLData(CleanDBData(req.body.orderId)); // Assuming it's a valid order ID
  
        // Update the order status in the "orders" table
        const ordersQuery = "UPDATE orders SET status = ? WHERE orderid = ?";
        const ordersData = await Qry(ordersQuery, [orderstatus, orderId]);
  
        if (orderstatus === "approved") {
          // Retrieve the user ID and total amount
          const userOrder = `SELECT * FROM orders WHERE orderid = ?`;
          const params = [orderId];
          const userOrderResult = await Qry(userOrder, params);
          console.log("orderdetails", userOrderResult[0]);
          const userOrderAmountResult = userOrderResult[0].totalamount;
          var userId = userOrderResult[0].userid;
          var sponsorIdQuery = "SELECT * FROM usersdata WHERE id = ?";
          var sponsorIdResult = await Qry(sponsorIdQuery, [userId]);
          var sponsorId = sponsorIdResult[0].sponsorid;
  
          var x = 1;
          while (x <= 10 && sponsorId !== "") {
            //sponsor1
  
            console.log("sponsorid1", sponsorId);
            var keyname = `unilevel_bonus_level${x}`;
            var selectBonus = `SELECT keyvalue FROM setting WHERE keyname = ? `;
            var dataBonus = await Qry(selectBonus, [keyname]);
            var levelbonus = dataBonus[0].keyvalue;
  
            console.log("levelbonus", levelbonus);
  
            var bonusAmount = (userOrderAmountResult * levelbonus) / 100;
            var sponsorBonusQuery = ` UPDATE usersdata SET current_balance = current_balance + ? WHERE id = ?`;
            var sponsorBonusResult = await Qry(sponsorBonusQuery, [
              bonusAmount,
              sponsorId,
            ]);
  
            //sponsor 2
            var sponsorIdQuery = "SELECT * FROM usersdata WHERE id = ?";
            var sponsorIdResult = await Qry(sponsorIdQuery, [sponsorId]);
            var sponsorId = sponsorIdResult[0].sponsorid;
  
            x++;
          }
          res.json({
            status: "success",
            message: "Order status updated successfully",
          });
        } else {
          res.json({
            status: "success",
            message: "Order status updated successfully",
          });
        }
      }
    } catch (error) {
      console.error("Error executing queries:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  router.post("/rejectorder", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        // Define the orderstatus values for pending and approved orders
  
        const rejectorder = CleanHTMLData(CleanDBData(req.body.rejectorder)); // Update with your desired pending status values
        const orderId = CleanHTMLData(CleanDBData(req.body.orderId)); // Update with your desired pending status values
        const rejectionreason = CleanHTMLData(
          CleanDBData(req.body.rejectionreason)
        );
        const ordersQuery =
          "UPDATE orders SET status = ?, reject_reason = ? WHERE orderid = ?";
        const ordersData = await Qry(ordersQuery, [
          rejectorder,
          rejectionreason,
          orderId,
        ]);
  
        res.json({
          status: "success",
          data: ordersData,
        });
      }
    } catch (error) {
      console.error("Error executing queries:", error);
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
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
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
      console.error("Error executing queries:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  //count total products
  
  router.post("/gettotalproducts", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        const getTotalProduct = `SELECT COUNT(*) AS product_count FROM products`;
        const TotalProductData = await Qry(getTotalProduct);
  
        res.json({
          status: "success",
          data: TotalProductData,
        });
      }
    } catch (error) {
      console.error("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  //count all pending orders
  
  router.post("/getpendingorders", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        const getPendingOrder = `SELECT COUNT(*) AS pending_order_count FROM orders WHERE status = 'pending'`;
        const TotalPendingOrder = await Qry(getPendingOrder);
  
        res.json({
          status: "success",
          data: TotalPendingOrder,
        });
      }
    } catch (error) {
      console.error("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  router.post("/getorderlist", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        // Define the orderstatus values for pending and approved orders
  
        const status = CleanHTMLData(CleanDBData(req.body.status)); // Update with your desired pending status values
        const ordersQuery = `SELECT 
        o.*,
        c.name AS countryname,
        s.name AS statename,
        COALESCE(ct.name, s.name) AS cityname
    FROM orders o 
    LEFT JOIN countries c ON c.id = o.country 
    LEFT JOIN states s ON s.id = o.state 
    LEFT JOIN cities ct ON ct.id = o.city
    WHERE o.status = ?
    ORDER BY o.id DESC;`;
        const ordersData = await Qry(ordersQuery, [status]);
  
        res.json({
          status: "success",
          data: ordersData,
        });
      }
    } catch (error) {
      console.error("Error executing queries:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  //Update Product Detail
  router.post("/updateproduct", upload.single("image"), async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      const postData = req.body;
      if (authUser) {
        const updates = [];
        const id = CleanHTMLData(CleanDBData(postData.id));
        delete postData.id;
        if (postData.image) {
          const uploadDir = path.join(__dirname, "../public/uploads/products/");
          const imageParts = req.body.image.split(";base64,");
          const imageTypeAux = imageParts[0].split("image/");
          const imageType = imageTypeAux[1];
          const imageBase64 = Buffer.from(imageParts[1], "base64");
  
          const filename = `${Date.now()}.png`;
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, imageBase64);
          postData.picture = filename;
        }
        delete postData.image;
  
        for (const [key, value] of Object.entries(postData)) {
          const sanitizedValue = CleanHTMLData(CleanDBData(value));
          updates.push(`${key} = '${sanitizedValue}'`);
        }
  
        const updateQuery = `UPDATE products  SET ${updates.join(
          ", "
        )}  WHERE id = ?`;
        const updateParams = [id];
        const updateResult = await Qry(updateQuery, updateParams);
  
        if (updateResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Product updated successfully",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update product",
          });
        }
      }
    } catch (error) {
      console.error("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  
  //delete product
  router.post("/deleteproduct", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
  
      if (authUser) {
        const postData = req.body;
        const id = CleanHTMLData(CleanDBData(postData.id));
  
        const deleteQuery = "DELETE from products WHERE id = ?";
        const deleteParams = [id];
        const deleteResult = await Qry(deleteQuery, deleteParams);
  
        if (deleteResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Product deleted successfully!",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to delete Product",
          });
        }
      }
    } catch (error) {
      console.error("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  router.post("/updateFeaturedStatus", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        const { id, featured } = req.body;
  
        const updateQuery = "UPDATE products SET featured = ? WHERE id = ?";
        const updateParams = [featured, id];
        const updateResult = await Qry(updateQuery, updateParams);
  
        if (updateResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Featured status updated successfully!",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update featured status",
          });
        }
      }
    } catch (error) {
      console.error("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  
  //upload product
  router.post("/uploadproduct", upload.single("image"), async (req, res) => {
    const todayDate = await getCurrentTime();
  
    const postData = req.body;
    try {
      const authUser = await adminAuthorization(req, res);
      const productTitle = postData.title;
      const productPrice = postData.price;
      const productWeight = ""; //postData.weight;
      const Points = postData.Points;
  
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");
      if (authUser) {
        try {
          const uploadDir = path.join(__dirname, "../public/uploads/products/");
          const imageParts = req.body.image.split(";base64,");
          const imageTypeAux = imageParts[0].split("image/");
          const imageType = imageTypeAux[1];
          const imageBase64 = Buffer.from(imageParts[1], "base64");
  
          const filename = `${Date.now()}.png`;
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, imageBase64);
  
          const insertQuery = `insert into products (title,price,picture,weight,createdat,updatedat,Points) values (?,?,?,?,?,?,?)`;
          const insertProduct = await Qry(insertQuery, [
            productTitle,
            productPrice,
            filename,
            productWeight,
            date,
            date,
            Points,
          ]);
  
          if (insertProduct) {
            res
              .status(200)
              .json({ status: "success", message: "New product successfully" });
          } else {
            res.status(500).json({
              status: "error",
              message: "Something went wrong. Please try again later.",
            });
          }
        } catch (error) {
          res.status(500).json({
            status: "error",
            message:
              "An error occurred while uploading file. Please try again later.",
          });
        }
      }
    } catch (e) {
      res.status(500).json({ status: "error", message: e });
    }
  });
  
  
  //select products
  router.post("/getproduct", async (req, res) => {
    const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        const getProduct = `SELECT * from products ORDER BY id DESC`;
        const ProductData = await Qry(getProduct);
        const imageURL = `${backoffice_link}uploads/products/`;
        res.json({
          status: "success",
          data: ProductData,
          imageURL: imageURL,
        });
      }
    } catch (error) {
      console.error("Error executing query:", error);
      res.json({
        status: "error",
        message: "Server error occurred",
      });
    }
  });
  

module.exports = router;
