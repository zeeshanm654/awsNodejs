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

//register new user
router.post("/register", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const randomCode = randomToken(10);
  const emailToken = randomToken(150);

  const sponsorid = CleanHTMLData(CleanDBData(postData.sponsorid));
  const pid = CleanHTMLData(CleanDBData(postData.pid));
  const username = CleanHTMLData(CleanDBData(postData.username)).toLowerCase();
  const firstname = CleanHTMLData(CleanDBData(postData.firstname));
  const lastname = CleanHTMLData(CleanDBData(postData.lastname));
  const email = CleanHTMLData(CleanDBData(postData.email));
  const mobile = CleanHTMLData(CleanDBData(postData.mobile));
  const address = CleanHTMLData(CleanDBData(postData.address));
  const password = CleanHTMLData(CleanDBData(postData.password));
  const country = 0//CleanHTMLData(CleanDBData(postData.country));
  const referralSide = CleanHTMLData(CleanDBData(postData.referralSide));
  const language = "";
  
  const zip_code = "";
  const city = 0//CleanHTMLData(CleanDBData(postData.city));
  const state = 0//CleanHTMLData(CleanDBData(postData.state));
  const birthday = "";

  // Generate a salt for password hashing
  const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
  const salt = bcrypt.genSaltSync(saltRounds);
  const options = {
    cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
    salt: salt, // Pass the generated salt
  };
  const hashedPassword = bcrypt.hashSync(password, options.cost);
  const encryptedPassword = crypto.AES.encrypt(
    hashedPassword,
    encryptionKey
  ).toString();

  try {
    const selectUsernameQuery = `SELECT * FROM usersdata WHERE username = ?`;
    const selectUsernameResult = await Qry(selectUsernameQuery, [username]);

    if (selectUsernameResult.length > 0) {
      res.json({
        status: "error",
        message: "username taken",
      });
      return;
    }

    const selectEmailQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectEmailResult = await Qry(selectEmailQuery, [email]);

    if (selectEmailResult.length > 0) {
      res.json({
        status: "error",
        message: "email exists",
      });
      return;
    }

    const selectSponsorQuery = `SELECT * FROM usersdata WHERE randomcode = ?`;
    const selectSponsorResult = await Qry(selectSponsorQuery, [sponsorid]);
    const userSponsorId = selectSponsorResult[0].id;

    let userPlacementId
    userPlacementId = userSponsorId
    if(sponsorid !== pid)
    {
      const selectPlacementQuery = `SELECT * FROM usersdata WHERE randomcode = ?`;
      const selectPlacementResult = await Qry(selectPlacementQuery, [pid]);
      userPlacementId = selectPlacementResult[0].id;  
    }

    if (
      !sponsorid ||
      !selectSponsorResult ||
      selectSponsorResult.length === 0
    ) {
      res.json({
        status: "error",
        message: "Invalid sponsor name",
      });
      return;
    }

    const insertResult = await Qry(
      `INSERT INTO usersdata (mobile,sponsorid,username,password,email,country, address, zipcode, city, firstname, lastname, randomcode, emailtoken,status,birth_date,state,referral_side,pid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`,
      [
        mobile,
        userSponsorId,
        username,
        encryptedPassword,
        email,
        country,
        address,
        zip_code,
        city,
        firstname,
        lastname,
        randomCode,
        emailToken,
        "pending",
        birthday,
        state,
        referralSide,
        userPlacementId
      ]
    );

    if (insertResult.affectedRows > 0) {
      // Email variables
      const company = company_name;
      const verify_link = `${weblink}login/${emailToken}/${email}`;

      const title = "Verify Your Account Registration on " + company;
      const emailimg = emailImagesLink + "welcome.png";
      const heading = "Registered Successfully";
      const subheading = "";

      // Construct the email content
      const body = `
            <p style="text-align:left">Dear ${username} <br> Thank you for registering with ${company}! We are delighted to have you on board. To complete the registration process and unlock full access to our platform, please verify your account by clicking the "Verify Account" button below:</p>
    
            <p><a href="${verify_link}" style="padding: 10px 15px;display: inline-block;border-radius: 5px;background: #1a253a;color: #fff;" class="btn btn-primary">Verify Account</a></p>
            
            <p style="text-align:left">
            If you are unable to click the button, you can also copy and paste the following link into your web browser:
            </p>
            
            <p style="text-align:left">${verify_link}</p>
            
            <p style="text-align:left">
            Please note that your account must be verified to ensure the security of your information and provide a seamless user experience. If you have any questions or need assistance, please don't hesitate to reach out to our support team at info@elevatedmarketplace.world or chat with a support at <a href="https://dashboard.elevatedmarketplace.world/">https://dashboard.elevatedmarketplace.world/</a>
            </p>
            <p  style="text-align:left">
            Thank you for choosing ${company}! <br>
    
            Best regards,<br>
            The ${company} Team
            </p>
          `;
      const mailOptions = {
        from: {
          name: "Elevated market place",
          address: noreply_email,
        },
        to: {
          name: username,
          address: email,
        },
        subject: "Signup successfully on " + company_name,
        html: emailTemplate(
          title,
          emailimg,
          heading,
          subheading,
          body,
          company_name
        ),
        text: body,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log("Error sending email:", err);
          res.json({
            status: "success",
            message: "email not sent",
            error: err,
          });
        } else {
              res.json({
                status: "success",
                message:"success",
              });
          
        }
      });
    } else {
      res.json({
        status: "error",
        message: "Server error occurred in registration",
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

//login user
router.post("/login", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const username = CleanHTMLData(CleanDBData(postData.username));
  const password = CleanHTMLData(CleanDBData(postData.password));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE username = ?`;
    const selectUserResult = await Qry(selectUserQuery, [username]);

    if (selectUserResult.length === 0) {
      res.json({
        status: "error",
        message: "Invalid login details",
      });
      return;
    }

    const user = selectUserResult[0];
    const decryptedPassword = crypto.AES.decrypt(
      user.password,
      encryptionKey
    ).toString(crypto.enc.Utf8);
    const passwordMatch = bcrypt.compareSync(password, decryptedPassword);

    if (!passwordMatch) {
      res.json({
        status: "error",
        message: "Invalid login details",
      });
      return;
    } else if (user.username === username && passwordMatch) {
      const token = jwt.sign({ username }, secretKey, { expiresIn: "12h" });
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");
      const expireat = new Date(date);
      expireat.setHours(expireat.getHours() + 1);

      //   const insertQuery = `INSERT INTO access_tokens (username, token, created_at, expire_at) VALUES (?, ?, ?, ?)`;
      //   const insertParams = [username, token, date, expireat];
      //   const insertResult = await Qry(insertQuery, insertParams);

      const updateLoginQuery = `UPDATE usersdata SET lastlogin = ?, lastip = ? WHERE username = ?`;
      const updateLoginParams = [todayDate, req.ip, username];
      const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);

      const userSelectQuery = `SELECT username, randomcode, firstname, lastname, email, picture, current_balance, status, mobile, emailstatus, address, country, createdat, loginstatus, lastlogin, lastip FROM usersdata WHERE id = ?`;
      const userSelectParams = [user.id];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);
      const userdbData = userSelectResult[0];

      if (updateLoginResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Login Successfully",
          token: token,
          user: userdbData,
        });
        return;
      }
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//login user
router.post("/manualsignin", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const token = CleanHTMLData(CleanDBData(postData.accesstoken));

  try {
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");

    const authUser = await manualLoginAuthorization(token, res);
    const updateLoginQuery = `UPDATE usersdata SET lastlogin = ?, lastip = ? WHERE id = ?`;
    const updateLoginParams = [todayDate, req.ip, authUser];
    const updateLoginResult = await Qry(updateLoginQuery, updateLoginParams);

    const userSelectQuery = `SELECT username, randomcode, firstname, lastname, email, picture, current_balance, status, mobile, emailstatus, address, country, createdat, loginstatus, lastlogin, lastip FROM usersdata WHERE id = ?`;
    const userSelectParams = [authUser];
    const userSelectResult = await Qry(userSelectQuery, userSelectParams);
    const userdbData = userSelectResult[0];

    if (updateLoginResult.affectedRows > 0) {
      res.json({
        status: "success",
        message: "Login Successfully",
        token: token,
        user: userdbData,
      });
      return;
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//forget password
router.post("/forgetpassword", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const randomcode = randomToken(150);

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email]);
    const userData = selectUserResult[0];

    if (!userData || userData.email !== email) {
      res.json({
        status: "error",
        message: "No account found with this email address",
      });
      return;
    }

    const title = "Password reset requested on " + company_name;
    const username = userData.username;
    const emailimg = emailImagesLink + "passwordreset.png";
    const resetLink = `${weblink}reset-password/${randomcode}/${email}`;
    const heading = "Password Reset";
    const subheading = "";
    const body = `Hello ${username},<br>You have requested a password reset on ${company_name} App. Please click on the reset button below:<br>
      <p><a href="${resetLink}" style="padding: 10px 15px;display: inline-block;border-radius: 5px;background: #1a253a;color: #fff;" class="btn btn-primary">Reset Password</a></p>`;

    const mailOptions = {
      from: {
        name: "Elevated market place",
        address: noreply_email,
      },
      to: {
        name: username,
        address: email,
      },
      subject: "Reset password requested " + company_name,
      html: emailTemplate(title, emailimg, heading, subheading, body),
      text: "This is the plain text version of the email content",
    };

    transporter.sendMail(mailOptions, async (err, info) => {
      if (!err) {
        const updateQuery = `UPDATE usersdata SET emailtoken = ? WHERE email = ?`;
        const updateParams = [randomcode, email];
        const updateResult = await Qry(updateQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          res.json({
            status: "success",
            message:
              "Email sent for password reset request. Please check your email.",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to update email token",
          });
        }
      } else {
        res.json({
          status: "error",
          message: "Failed to send email",
        });
      }
    });
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//reset password
router.post("/resetpassword", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const password = CleanHTMLData(CleanDBData(postData.password));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email]);
    const userData = selectUserResult[0];

    if (!userData || userData.email !== email) {
      res.json({
        status: "error",
        message: "Invalid account",
      });
      return;
    }

    // Generate a salt for password hashing
    const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
    const salt = bcrypt.genSaltSync(saltRounds);

    const options = {
      cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
      salt: salt, // Pass the generated salt
    };
    const hashedPassword = bcrypt.hashSync(password, options.cost);
    const encryptedPassword = crypto.AES.encrypt(
      hashedPassword,
      encryptionKey
    ).toString();

    const updateQuery = `UPDATE usersdata SET password = ?, emailtoken = '' WHERE email = ?`;
    const updateParams = [encryptedPassword, email];
    const updateResult = await Qry(updateQuery, updateParams);

    if (updateResult.affectedRows > 0) {
      res.json({
        status: "success",
        message: "Password updated successfully",
      });
    } else {
      res.json({
        status: "error",
        message: "Failed to update password",
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

//validate email token
router.post("/validateemailtoken", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const token = CleanHTMLData(CleanDBData(postData.token));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE email = ? AND emailtoken = ?`;
    const selectUserResult = await Qry(selectUserQuery, [email, token]);
    const userData = selectUserResult[0];

    if (userData && userData.email === email && userData.emailtoken === token) {
      res.json({
        status: "success",
        message: "Valid token",
      });
    } else {
      res.json({
        status: "error",
        message: "Invalid token",
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

//verify email status

router.post("/verifyemailaccount", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const email = CleanHTMLData(CleanDBData(postData.email));
  const token = CleanHTMLData(CleanDBData(postData.token));

  try {
    const selectUserQuery =
      "SELECT * FROM usersdata WHERE email = ? AND emailtoken = ?";
    const selectUserResult = await Qry(selectUserQuery, [email, token]);
    const userData = selectUserResult[0];

    if (userData && userData.email === email && userData.emailtoken === token) {
      const updateQuery =
        'UPDATE usersdata SET emailtoken = "", emailstatus = "verified" WHERE email = ? AND emailtoken = ?';
      const updateParams = [email, token];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "valid token",
        });
      } else {
        res.json({
          status: "error",
          message: "server error",
        });
      }
    } else {
      res.json({
        status: "error",
        message: "Invalid token",
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

//login user data
router.post("/userdata", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    try {
      const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
  
      if (authUser) {
      const userSelectResult = await Qry(`SELECT ud.id as userid,ud.deposit_balance as accountbalance, ud.sponsorid,ud.referral_side, ud.username, ud.randomcode, ud.firstname, ud.lastname, ud.email, ud.picture, ud.current_balance, ud.status, ud.mobile, ud.emailstatus, ud.address, ud.country, ud.createdat, ud.loginstatus, ud.lastlogin, ud.lastip, ud.user_type, ud.membership, ud.city, ud.state, ud.pkgid, ud.stockist,ud.stockist_balance,ud.walletaddress, p.title as currentpkgname,p.thumbnail as pkgthumbnail,
        bt.left_points, bt.right_points, bt.total_left_points, bt.total_right_points, bt.converted_points,
        ud.investment, ud.upgradeeligible, ud.newMessage, ud.kyc_status, ud.disclosure, ud.planid
        FROM usersdata ud
        left join packages p on p.id =  ud.pkgid
        left join binarytree bt on bt.userid =  ud.id
        WHERE ud.id = ?`, [authUser]);
        const userdbData = userSelectResult[0];

        const kycData = await Qry(`select * from kyc where userid = ? order by id desc limit 1`,[authUser]) 
        
          const sponsorSelectResult = await Qry(
            `SELECT username AS sponsorusername FROM usersdata WHERE id = ?`,
            [userdbData.sponsorid]
          );
          const sponsordbData = sponsorSelectResult[0];
          if(sponsorSelectResult.length > 0)
          {
            userdbData.sponsorusername = sponsordbData.sponsorusername;
  
          }
          else {
            userdbData.sponsorusername = "admin";
          }
  
  
        const selectTreeResult = await Qry(
          `SELECT COUNT(*) AS count FROM usersdata WHERE sponsorid = ? AND status = ?`,
          [authUser, "approved"]
        );
        const count = selectTreeResult[0].count;
  
        let transactionResult = await Qry(
          `SELECT
        DATE_FORMAT(createdat, '%b') AS month,
        ROUND(SUM(amount)) AS amount FROM transaction WHERE receiverid = ? GROUP BY month ORDER BY
        FIELD(month, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')`,
          [authUser]
        );
        if(transactionResult.length < 1)
        {
          transactionResult = []
        }
  
        const totalRefBonusSelectResult = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalrefBonus FROM transaction 
          WHERE createdat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 6 DAY) + INTERVAL 0 SECOND
          AND createdat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) - 1 DAY) + INTERVAL 86399 SECOND
          and
          type = ? AND receiverid = ? and status = 'approved'`,
          ["referralbonus", authUser]
        );
        const totalRefBonusdbData = totalRefBonusSelectResult[0].totalrefBonus;
  
  
  
        const totalroiSelectResult = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalroi FROM transaction 
          WHERE createdat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 6 DAY) + INTERVAL 0 SECOND
          AND createdat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) - 1 DAY) + INTERVAL 86399 SECOND
          and
          type = ? AND receiverid = ? and status = 'approved'`,
          ["roi", authUser]
        );
        const totalroidbData = totalroiSelectResult[0].totalroi;
  
  
        const totalLevelBonusSelectResult = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalLevelBonus FROM transaction 
          WHERE createdat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 7 DAY) + INTERVAL 0 SECOND
          AND createdat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) - 1 DAY) + INTERVAL 86399 SECOND
          and
          type = ? AND receiverid = ? and status = 'approved'`,
          ["unilevelbonus", authUser]
        );
        const totalLevelBonusdbData = totalLevelBonusSelectResult[0].totalLevelBonus;
  
        const totalPairingBonusSelectResult = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalPairingBonus FROM transaction 
          WHERE createdat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 6 DAY) + INTERVAL 0 SECOND
          AND createdat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) - 1 DAY) + INTERVAL 86399 SECOND
          and
          type = ? AND receiverid = ? and status = 'approved'`,
          ["matchingbonus", authUser]
        );
        const totalPairingBonus = totalPairingBonusSelectResult[0].totalPairingBonus;
  
  
        const totalSpendingResult = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalSpending FROM transaction WHERE type IN ('investment') AND senderid = ? and status = 'approved'`,
          [authUser]
        );
        const totalSpending = totalSpendingResult[0].totalSpending;
  
        let spendingSelectResult = await Qry(
          `SELECT
        DATE_FORMAT(createdat, '%b') AS month,
        ROUND(SUM(amount)) AS amount FROM transaction WHERE senderid = ? and type IN ('investment') and status = 'approved' GROUP BY month ORDER BY
        FIELD(month, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')`,
          [authUser]
        );
        if(spendingSelectResult.length < 1)
        {
          spendingSelectResult = []
        }
        const totalEarningResult = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalEarning FROM transaction WHERE type IN ('unilevelbonus', 'referralbonus','matchingbonus') AND receiverid = ? and status = 'approved'`,
          [authUser]
        );
        const totalEarning = totalEarningResult[0].totalEarning;
  
        const earningSelectResult = await Qry(
          `SELECT
        DATE_FORMAT(createdat, '%b') AS month,
        ROUND(SUM(amount)) AS amount FROM transaction WHERE receiverid = ? and type IN ('unilevelbonus', 'referralbonus','matchingbonus') and status = 'approved' GROUP BY month ORDER BY
        FIELD(month, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')`,
          [authUser]
        );
  
        const totalStockistBonusSelectResult = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalStockistBonus FROM transaction WHERE type = ? AND receiverid = ? and status = 'approved'`,
          ["stockistbonus", authUser]
        );
        const totalStockistBonus = totalStockistBonusSelectResult[0].totalStockistBonus;
  
  
        const totalPendingLeftPoints = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalPendingLeftPoints FROM pendingpoints WHERE status = ? AND receiverid = ? and leg = ?`,
          ["pending", authUser, 'L']
        );
  
        
  
        const totalPendingRightPoints = await Qry(
          `SELECT COALESCE(ROUND(SUM(amount)), 0) AS totalPendingRightPoints FROM pendingpoints WHERE status = ? AND receiverid = ? and leg = ?`,
          ["pending", authUser, 'R']
        );
  
        const settingsData = await Qry(
          `select * from setting where keyname in ('popup_status','popup_detail', 'kyc') order by id asc`
        );
  
        userdbData.activereferrals = count;
        userdbData.referrallink = `${weblink}signup/${userdbData.randomcode}`;
        userdbData.profilepictureurl = `${backoffice_link}uploads/userprofile/${userdbData.picture}`;
        userdbData.balancetransactions = transactionResult;
        userdbData.totalRefBonus = authUser === 16 ? 0 : totalRefBonusdbData;
        userdbData.totalLevelBonus = authUser === 16 ? 0 :  totalLevelBonusdbData;
        userdbData.totalroi = authUser === 16 ? 0 :  totalroidbData;
        userdbData.totalPairingBonus = authUser === 16 ? 0 :  totalPairingBonus;
        userdbData.totalSpending = authUser === 16 ? 0 :  totalSpending;
        userdbData.spendingSelectResult = authUser === 16 ? 0 :  spendingSelectResult;
        userdbData.totalEarning = authUser === 16 ? 0 :  totalEarning;
        userdbData.totalStockistBonus = authUser === 16 ? 0 :  totalStockistBonus;
        userdbData.totalPendingLeftPoints = totalPendingLeftPoints[0].totalPendingLeftPoints;
        userdbData.totalPendingRightPoints = totalPendingRightPoints[0].totalPendingRightPoints;
        userdbData.earningSelectResult = authUser === 16 ? 0 :  earningSelectResult;
        userdbData.nprice = nairaprice
        userdbData.settingsdata = settingsData;
        userdbData.kycRejectReason = userSelectResult[0]?.kyc_status === "Rejected" ? kycData[0]?.reason : '';
  
  
        res.json({
          status: "success",
          data: userdbData,
        });
      }
    } catch (error) {
      res.json({
        status: "error",
        message: "Server error occurred in query",
        error:error.message
      });
    }
  });

//single user data
router.post("/singleuserdata", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const randomcode = CleanHTMLData(CleanDBData(postData.randomcode));

  try {
    const userSelectQuery = `SELECT sponsorid,username, randomcode, firstname, lastname, email, picture, current_balance,referral_side,  status, mobile, emailstatus, address, country, createdat, loginstatus, lastlogin, lastip, customerid,kyc_status FROM usersdata WHERE randomcode = ?`;

    const userSelectParams = [randomcode];
    const userSelectResult = await Qry(userSelectQuery, userSelectParams);
    const userdbData = userSelectResult[0];

    const sponsorSelectQuery = `SELECT username AS sponsorusername FROM usersdata WHERE id = ?`;
    const sponsorSelectParams = [userdbData.sponsorid];
    const sponsorSelectResult = await Qry(
      sponsorSelectQuery,
      sponsorSelectParams
    );
    const sponsordbData = sponsorSelectResult[0];

    if (userdbData.sponsorid === "") {
      userdbData.sponsorusername = "admin";
    } else {
      userdbData.sponsorusername = sponsordbData.sponsorusername;
    }

    res.json({
      status: "success",
      data: userdbData,
    });
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


//monthly spending or earning
router.post("/monthlyinvestandeearning", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const transSelect = await Qry(
        `SELECT
    DATE_FORMAT(createdat,'%b') AS month,
    ROUND(SUM(CASE WHEN type IN ('referralbonus', 'matchingbonus', 'unilevelbonus', 'roi') THEN amount ELSE 0 END), 2) AS earning,
    ROUND(SUM(CASE WHEN type IN ('investment') THEN amount ELSE 0 END), 2) AS spending
FROM transaction
WHERE
    status = 'approved' and
    (
    (receiverid = ? AND type IN ('referralbonus', 'matchingbonus', 'unilevelbonus', 'roi'))
    OR
    (senderid = ? AND type IN ('investment'))
    )
GROUP BY DATE_FORMAT(createdat,'%b')
ORDER BY MONTH(month)
`,[authUser,authUser]
      );

      if (transSelect.length > 0) {
        const transArray = { entries: transSelect };
        res.status(200).json({ status: "success", data: authUser === 16 ? {entries: []} :  transArray });
      } else {
        const transArray = {
          entries: [],
        };
        res.status(200).json({ status: "success", data: transArray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});
//admin messages
router.post("/getmessageslistDropDown", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const messagesSelect = await Qry(
        `SELECT m.*, s.username  as senderusername,r.username as receiverusername
        , 	CASE 
                WHEN ms.messageid IS NOT NULL THEN 'seen'
                ELSE 'unseen'
            END AS mstatus
        FROM messages m 
              left join usersdata s on s.id = m.sender
              left join usersdata r on r.id = m.receiver
              left join messagestatus ms on ms.messageid = m.id
              where (receiver = '${authUser}' OR receiver = 'all') 
              group by randomcode
              order by id desc`
      );

      const messagesArray = { enteries: messagesSelect };
      res.status(200).json({ status: "success", data: messagesArray });

    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/getmessages", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const type = CleanHTMLData(CleanDBData(req.body.type));

      const GetAllMessages = `SELECT m.*, s.username  as senderusername,r.username as receiverusername
      , 	CASE 
              WHEN ms.messageid IS NOT NULL THEN 'seen'
              ELSE 'unseen'
          END AS mstatus
      FROM messages m 
            left join usersdata s on s.id = m.sender
            left join usersdata r on r.id = m.receiver
            left join messagestatus ms on ms.messageid = m.id
            where (${type} = ? or ${type} = ?)
            group by randomcode
            order by id desc
      `;
      let TotalMessages = await Qry(GetAllMessages,['all', authUser]);

      if(TotalMessages.length > 0)
      {
        res.json({
          status: "success",
          data: TotalMessages,
        });
      }else{
        res.json({
          status: "success",
          data: [],
        });
      }
      
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//get single message
router.post("/getsinglemessage", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const { messageid } = req.body;

      const messagesSelect = await Qry(`SELECT m.*, ud.username as sendername
      FROM messages m
      LEFT JOIN usersdata ud ON m.sender = ud.id
      WHERE m.randomcode = '${messageid}' AND (m.receiver = 'all' OR m.receiver = '${authUser}')
      
    `);

      await Qry(`update messages set status  = 'seen' WHERE randomcode = '${messageid}' and receiver = '${authUser}'`)

      if (messagesSelect.length > 0) {
        res.status(200).json({ status: "success", data: messagesSelect });
      } else {
        res.status(200).json({ status: "error", data: "no data found" });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

router.post("/sendmessage", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); 
    if (authUser) {
      let randomCode 
      if(!req.body.randomcode)
      {
        randomCode = randomToken(10);
      }else{
        randomCode = CleanHTMLData(CleanDBData(req.body.randomcode));
      }
      let username = CleanHTMLData(CleanDBData(req.body.username));
      const title = CleanHTMLData(CleanDBData(req.body.title));
      const message = req.body.message;
      checkUser = await Qry(`select * from usersdata where username = 'admin'`)
      
      if(checkUser.length > 0)
      {
        console.log("ok")
          const insertMessage = await Qry(`insert into messages (randomcode,sender,receiver,title,message,createdat) values (?,?,?,?,?,?)`,[randomCode,authUser,username,title,message,todayDate]);
          if(insertMessage.affectedRows > 0)
          {
           res.json({
             status: "success",
             message: "",
             data:{
              sender:authUser,
              title,
              message,
              createdat:todayDate,
            }
           });
          }
        
      }else{
        res.json({
          status: "error",
          message: "No user found with this username",
        });
        return
      }


    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//notifications data
router.post("/getnotifications", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const notificationsSelect = await Qry(`
      SELECT id, type, seen, details, createdat AS date
      FROM transaction
      WHERE (senderid = '${authUser}' OR receiverid = '${authUser}')
      AND NOT (senderid = '${authUser}' AND type = 'referralbonus')
      ORDER BY id DESC LIMIT 5
    `);

      if (notificationsSelect.length > 0) {
        const notificationsArray = { entries: notificationsSelect };
        res.status(200).json({ status: "success", data: notificationsArray });
      } else {
        const notificationsArray = {
          entries: [{ id: 1, type: "empty", details: "no new notifications" }],
        };
        res.status(200).json({ status: "success", data: notificationsArray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//last 7 days transactions
router.post("/lastweektransactions", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const transactionSelect = await Qry(`
      SELECT * 
      FROM transaction
      WHERE createdat > DATE(NOW() - INTERVAL 7 DAY) AND (senderid = '${authUser}' OR receiverid = '${authUser}')  and status = 'approved'
      ORDER BY id DESC
    `);

      const transactiondbData = transactionSelect;
      const transactionarray = { entries: transactiondbData };

      if (transactiondbData.length > 0) {
        res.status(200).json({ status: "success", data: transactionarray });
      } else {
        transactionarray.entries = [];
        res.status(200).json({ status: "success", data: transactionarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//get all referral users
//get all referral users
router.post("/referralusers", async (req, res) => {
const todayDate = await getCurrentTime();
limit = CleanHTMLData(CleanDBData(req.body.limit));

  try {
    let limitCondition = ""
    if(limit)
    {
      limitCondition = `limit ${limit}`
    }
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const referralSelect = await Qry(`
      SELECT 
      ud.id,
      ud.username, 
      ud.firstname, 
      ud.lastname, 
      ud.picture, 
      ud.status, 
      ud.country, 
      ud.mobile, 
      ud.email, 
      ud.referral_side,
      DATE_FORMAT(unf.createdat, '%m/%d/%Y') AS createdat, 
      unf.usdprice,
      COALESCE(SUM(CASE WHEN tr.type IN ('unilevelbonus', 'referralbonus', 'matchingbonus') 
                        THEN tr.amount ELSE 0 END), 0) AS total_bonus      
  FROM 
      usersdata ud
  LEFT JOIN 
      transaction tr ON tr.receiverid = ud.id
                     AND tr.createdat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 7 DAY) + INTERVAL 0 SECOND
                     AND tr.createdat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) - 1 DAY) + INTERVAL 86399 SECOND  
                     AND tr.status = 'approved'
  LEFT JOIN 
      usernfts unf ON unf.userid = ud.id
  WHERE 
      ud.sponsorid = '${authUser}'
  GROUP BY 
      ud.id
  ORDER BY 
      ud.id DESC ${limitCondition}
    `);

      const referraldbData = referralSelect;
      const referralArray = { entries: referraldbData };

      if (referraldbData.length > 0) {
        referralArray.picturelink = `${backoffice_link}/uploads/userprofile/`;
        res.status(200).json({ status: "success", data: referralArray });
      } else {
        const referralArray = { entries: [] };
        res
          .status(200)
          .json({
            status: "error",
            data: referralArray,
            message: "no referral found",
          });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//update user profile data
router.post("/updateprofiledata", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  let updateType = ""
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const updates = [];
      postData.updatedat = todayDate;
      updateType = postData.updateType
      walletaddress = postData.walletaddress
      newUsername = postData.username
      const checkUser = await Qry(`select * from usersdata where id = ?`,[authUser])
      const currentUsername = checkUser[0]?.username
      if(newUsername !== currentUsername)
      {
        const validateUsername = await Qry(`select * from usersdata where username = ?`,[newUsername])
        if(validateUsername.length > 0)
        {
          res.json({
            status: "error",
            message: "username_already_existed",
          });
          return
        }
      }
      if(updateType === "walletaddress")
      {
        checkWallet = await Qry(`select * from usersdata where walletaddress = ?`,[walletaddress])
        if(checkWallet.length > 0)
        {
          res.json({
            status: "error",
            message: "wallet_already_existed",
          });
          return
        }
      }
      delete postData.updateType

      for (const [key, value] of Object.entries(postData)) {
        const sanitizedValue = CleanHTMLData(CleanDBData(value));
        updates.push(`${key} = '${sanitizedValue}'`);
      }

      const updateQuery = `UPDATE usersdata SET ${updates.join(
        ", "
      )} WHERE id = '${authUser}'`;
      const updateResult = await Qry(updateQuery);

      if (updateResult) {
        res
          .status(200)
          .json({
            status: "success",
            message: "",
          });
      } else {
        res
          .status(500)
          .json({
            status: "error",
            message: "",
          });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});


//update profile picture
//update profile picture
router.post(
  "/updateprofilepicture",
  upload.single("image"),
  async (req, res) => {
const todayDate = await getCurrentTime();

    const postData = req.body;
    try {
      const authUser = await checkAuthorization(req, res);
      if (authUser) {
        const uploadDir = path.join(
          __dirname,
          "../public/uploads/userprofile/"
        );
        const imageParts = req.body.image.split(";base64,");
        const imageTypeAux = imageParts[0].split("image/");
        const imageType = imageTypeAux[1];
        const imageBase64 = Buffer.from(imageParts[1], "base64");

        const filename = `${Date.now()}.png`;
        const filePath = path.join(uploadDir, filename);

        try {
          fs.writeFileSync(filePath, imageBase64);
          const date = new Date().toISOString();

          const updateQuery = `UPDATE usersdata SET picture = '${filename}', updatedat = '${todayDate}'  WHERE id = '${authUser}'`;
          const updateResult = await Qry(updateQuery);

          if (updateResult) {
            const pictureUrl = `${req.protocol}://${req.get(
              "host"
            )}/uploads/userprofile/${filename}`;
            res.status(200).json({
              status: "success",
              message: "",
              pictureurl: pictureUrl,
            });
          } else {
            res.status(500).json({
              status: "error",
              message: "Something wrong",
            });
          }
        } catch (error) {
          res.status(500).json({
            status: "error",
            message:
              "error occurred",
          });
        }
      }
    } catch (e) {
      res.status(500).json({ status: "error", message: e.message });
    }
  }
);

//update profile password
router.post("/updatepassword", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const oldpassword = CleanHTMLData(CleanDBData(postData.oldpassword));
    const newpassword = CleanHTMLData(CleanDBData(postData.newpassword));
    if (authUser) {
      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [authUser]);
      const userData = selectUserResult[0];

      if (!userData || userData.id !== authUser) {
        res.json({
          status: "error",
          message: "Invalid data contact support for this issue",
        });
        return;
      }

      // Generate a salt for password hashing
      const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
      const salt = bcrypt.genSaltSync(saltRounds);

      const options = {
        cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
        salt: salt, // Pass the generated salt
      };
      const hashedPassword = bcrypt.hashSync(newpassword, options.cost);
      const encryptedPassword = crypto.AES.encrypt(
        hashedPassword,
        encryptionKey
      ).toString();
      const decryptedPassword = crypto.AES.decrypt(
        userData.password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(oldpassword, decryptedPassword);

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Incorrect",
        });
        return;
      }

      const updateQuery = "UPDATE usersdata SET password = ? WHERE id = ?";
      const updateParams = [encryptedPassword, authUser];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "",
        });
      }
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});



// Start Dshboard
router.post("/dashboarddata", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      // start sum of left and right points of current month
      const selectCurrentMonthLeftPointsQuery = `Select SUM(points) as total From points 
      WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
      and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
      const selectCurrentMonthLeftPointsResult = await Qry(
        selectCurrentMonthLeftPointsQuery,
        ["L", "Binary Points"]
      );

      const selectCurrentMonthRightPointsQuery = `Select SUM(points) as total From points 
      WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
      and leg = ? and type = ? and MONTH(dat) = MONTH(now()) and YEAR(dat) = YEAR(now())`;
      const selectCurrentMonthRightPointsResult = await Qry(
        selectCurrentMonthRightPointsQuery,
        ["R", "Binary Points"]
      );
      // end sum of left and right points of current month

      // start package details
      const selectPackageQuery = `SELECT * FROM new_packages WHERE userid = ?`;
      const selectPackageResult = await Qry(selectPackageQuery, [authUser]);
      // end package details

      // start payout details
      const selectTransactionsCurrentMonthQuery = `SELECT SUM(final_amount) as total FROM transaction WHERE type = ? and receiverid = ? and MONTH(createdat) = MONTH(now()) and YEAR(createdat) = YEAR(now())  and status = 'approved'`;
      const selectCurrentMonthPayoutResult = await Qry(
        selectTransactionsCurrentMonthQuery,
        ["Payout", authUser]
      );

      const selectAllTimeQuery = `SELECT SUM(final_amount) as total FROM transaction WHERE type = ? and receiverid = ?  and status = 'approved'`;
      const selectAllTimePayoutResult = await Qry(selectAllTimeQuery, [
        "Payout",
        authUser,
      ]);
      // end payout details

      // start rank details
      const selectUserRankQuery = `
      SELECT 
      ud.username, 
      rn.name AS rank_name,
      lt.name AS life_time_rank_name
      FROM usersdata ud
      LEFT JOIN rank rn ON ud.rank = rn.id
      LEFT JOIN rank lt ON ud.life_time_rank = lt.id
      WHERE ud.id = ?
      `;
      const selectUserRankResult = await Qry(selectUserRankQuery, [authUser]);
      // end rank details

      // start latest news data
      const selectnewsQuery = `SELECT * FROM news ORDER BY id DESC limit 1`;
      const selectnewsResult = await Qry(selectnewsQuery);
      // end latest news data

      // start get last 5 month function
      function getMonthsInfo(num) {
        var currentDate = new Date();
        var currentMonth = currentDate.getMonth() + 1;
        var previousMonth = currentMonth - num;
        if (previousMonth < 1) {
          previousMonth += 12;
        }
        var previousMonthStr = previousMonth.toString().padStart(2, "0");
        return previousMonthStr;
      }
      // start get month name
      function getMonthName(monthNumber) {
        const monthNames = [
          "Jan",
          "Feb",
          "March",
          "April",
          "May",
          "June",
          "July",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        if (monthNumber >= 1 && monthNumber <= 12) {
          return monthNames[monthNumber - 1];
        } else {
          return "Invalid Month";
        }
      }

      // start last 5 months active referrals
      let personalLeftRightArray = [];
      for (let i = 1; i <= 5; i++) {
        let monthNum = getMonthsInfo(5 - i);
        let monthName = getMonthName(parseInt(monthNum));

        const leftPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
        const leftPersoanlActiveGraphResult = await Qry(
          leftPersonalActiveGraphQuery,
          ["L", "Referral Binary Points", monthNum]
        );

        const rightPersonalActiveGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
        const rightPersoanlActiveGraphResult = await Qry(
          rightPersonalActiveGraphQuery,
          ["R", "Referral Binary Points", monthNum]
        );

        let leftCount = leftPersoanlActiveGraphResult[0].total.toString();
        let rightCount = rightPersoanlActiveGraphResult[0].total.toString();
        let leftRightStr = leftCount + "/" + rightCount;
        let object = {
          month: monthName,
          count: leftRightStr,
        };
        personalLeftRightArray.push(object);
      }
      // end last 5 months active referrals

      // start last 5 months organization members
      let organizationLeftRightArray = [];
      for (let i = 1; i <= 6; i++) {
        let monthNum = getMonthsInfo(6 - i);
        let monthName = getMonthName(parseInt(monthNum));

        const leftOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
        const leftOrganizationGraphResult = await Qry(
          leftOrganizationGraphQuery,
          ["L", "Binary Points", monthNum]
        );

        const rightOrganizationGraphQuery = `Select COUNT(id) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
        const rightOrganizationGraphResult = await Qry(
          rightOrganizationGraphQuery,
          ["R", "Binary Points", monthNum]
        );

        let organizationLeftCount =
          leftOrganizationGraphResult[0].total.toString();
        let organizationRightCount =
          rightOrganizationGraphResult[0].total.toString();
        let object = {
          month: monthName,
          LeftMembers: organizationLeftCount,
          RightMembers: organizationRightCount,
        };
        organizationLeftRightArray.push(object);
      }
      // end last 5 months organization members

      // start last 5 months organization points
      let organizationLeftRightPointsArray = [];
      for (let i = 1; i <= 6; i++) {
        let monthNum = getMonthsInfo(6 - i);
        let monthName = getMonthName(parseInt(monthNum));

        const leftOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
        const leftOrganizationPointsGraphResult = await Qry(
          leftOrganizationPointsGraphQuery,
          ["L", "Binary Points", monthNum]
        );

        const rightOrganizationPointsGraphQuery = `Select SUM(points) as total From points 
          WHERE JSON_SEARCH(receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids') IS NOT NULL
          and leg = ? and type = ? and MONTH(dat) = ? and YEAR(dat) = YEAR(now())`;
        const rightOrganizationPointsGraphResult = await Qry(
          rightOrganizationPointsGraphQuery,
          ["R", "Binary Points", monthNum]
        );

        if (leftOrganizationPointsGraphResult[0].total === null) {
          leftOrganizationPointsGraphResult[0].total = 0;
        }
        if (rightOrganizationPointsGraphResult[0].total === null) {
          rightOrganizationPointsGraphResult[0].total = 0;
        }

        let organizationLeftPointsCount =
          leftOrganizationPointsGraphResult[0].total;
        let organizationRightPointsCount =
          rightOrganizationPointsGraphResult[0].total;

        let object = {
          month: monthName,
          LeftPoints: organizationLeftPointsCount,
          RightPoints: organizationRightPointsCount,
        };
        organizationLeftRightPointsArray.push(object);
      }
      // end last 5 months organization points

      // start last 5 months payout
      let payoutArray = [];
      for (let i = 1; i <= 5; i++) {
        let monthNum = getMonthsInfo(5 - i);
        let monthName = getMonthName(parseInt(monthNum));

        const payoutGraphQuery = `Select SUM(final_amount) as total From transaction
          WHERE type = ? and receiverid = ? and MONTH(createdat) = ? and YEAR(createdat) = YEAR(now())  and status = 'approved'`;
        const payoutGraphResult = await Qry(payoutGraphQuery, [
          "Payout",
          authUser,
          monthNum,
        ]);

        if (payoutGraphResult[0].total === null) {
          payoutGraphResult[0].total = "0";
        }

        let payoutCount = payoutGraphResult[0].total;
        let object = {
          month: monthName,
          count: payoutCount,
        };
        payoutArray.push(object);
      }
      // end last 5 months payout

      res.status(200).json({
        status: "success",
        binaryPoints: {
          left: selectCurrentMonthLeftPointsResult[0].total,
          right: selectCurrentMonthRightPointsResult[0].total,
        },
        payout: {
          currentMonth: selectCurrentMonthPayoutResult[0].total,
          allTime: selectAllTimePayoutResult[0].total,
        },
        rankData: selectUserRankResult,
        news: selectnewsResult,
        planData: selectPackageResult,
        activeReferralsGraphData: personalLeftRightArray,
        organizationMembersGraphData: organizationLeftRightArray,
        organizationPointsGraphData: organizationLeftRightPointsArray,
        payoutGraphData: payoutArray,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});
// End Dshboard

router.post("/selecttransactions", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);

    if (authUser) {
      const postData = req.body;
      const type = CleanHTMLData(CleanDBData(postData.type));
      const status = CleanHTMLData(CleanDBData(postData.status));
      const userType = CleanHTMLData(CleanDBData(postData.usertype));

      let userCondition;
      if (userType === "sender") {
        userCondition = `And t.senderid = ${authUser}`;
      } else {
        userCondition = `And t.receiverid = ${authUser}`;
      }

      let statuscondition = "";
      if (status !== "all") {
        statuscondition = `AND t.status = '${status}'`;
      }

      const selectTransactionsQuery = `SELECT t.*, u1.username as senderusername, u2.username as receiverusername from 
      transaction t 
    LEFT JOIN usersdata u1 ON t.senderid = u1.id 
    LEFT JOIN usersdata u2 ON t.receiverid = u2.id 
    WHERE t.type = ? ${statuscondition} ${userCondition}`;
      const selectTransactionsResult = await Qry(selectTransactionsQuery, [
        type,
      ]);

      const transactionHistory = await Qry(`SELECT 
      SUM(CASE WHEN t.createdat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 7 DAY) + INTERVAL 0 SECOND
               AND t.createdat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 1 DAY) + INTERVAL 86399 SECOND
               THEN amount ELSE 0 END) AS week_total,
      SUM(CASE WHEN YEAR(t.createdat) = YEAR(NOW()) AND MONTH(t.createdat) = MONTH(NOW())
               THEN amount ELSE 0 END) AS month_total,
      SUM(CASE WHEN YEAR(t.createdat) = YEAR(NOW())
               THEN amount ELSE 0 END) AS year_total
  FROM 
      transaction t
  where type = ? ${statuscondition} ${userCondition}`, [type])

      res.status(200).json({
        status: "success",
        data: selectTransactionsResult,
        history:transactionHistory
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ status: "error", message: e.message });
  }
});
// Start news
router.post("/news", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      // start latest news data
      const selectnewsQuery = `SELECT * FROM news ORDER BY id DESC`;
      const selectnewsResult = await Qry(selectnewsQuery);
      // end latest news data

      res.status(200).json({
        status: "success",
        news: selectnewsResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/singlenews", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      let id = postData.newsid;
      // start latest news data
      const selectnewsQuery = `SELECT * FROM news where id = ?`;
      const selectnewsResult = await Qry(selectnewsQuery, [id]);
      // end latest news data

      res.status(200).json({
        status: "success",
        news: selectnewsResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});
// End news
router.post(
  "/uploadkycdata",
  upload.fields([
    { name: "idcardFront", maxCount: 1 },
    { name: "idcardBack", maxCount: 1 },
  ]),
  async (req, res) => {
    const todayDate = await getCurrentTime();

    const postData = req.body;
    try {
      const authUser = await checkAuthorization(req, res);
      if (authUser) {
        const userSelect = await Qry (`select * from usersdata where id = ?`, [authUser])
        const userData = userSelect[0] 
        let id_front, id_back;
        const uploadDir = path.join(__dirname, "../public/uploads/kyc/");

        const identityType = CleanHTMLData(CleanDBData(postData.identityType));
        const residentialAddress = CleanHTMLData(CleanDBData(postData.residentialAddress));
        const name = CleanHTMLData(CleanDBData(postData.name));
        const phone = CleanHTMLData(CleanDBData(postData.phone));
        const email = CleanHTMLData(CleanDBData(postData.email));
        const date = new Date().toISOString().slice(0, 19).replace("T", " ");

        if (identityType === "Passport") {
          const idCardFront = postData.idcardFront.split(";base64,");
          const idCardFrontTypeAux = idCardFront[0].split("image/");
          const idCardFrontType = idCardFrontTypeAux[1];
          const idCardFrontBase64 = Buffer.from(idCardFront[1], "base64");
          const idCardFrontFilename = `${Date.now()}.png`;
          const idCardFrontFilePath = path.join(uploadDir, idCardFrontFilename);
          fs.writeFileSync(idCardFrontFilePath, idCardFrontBase64);
          id_front = idCardFrontFilename;
          id_back = "";
        } else if (identityType === "Driving License") {
          // Process the front and back sides of the identity (ID card)
          const idCardFront = postData.idcardFront.split(";base64,");
          const idCardFrontTypeAux = idCardFront[0].split("image/");
          const idCardFrontType = idCardFrontTypeAux[1];
          const idCardFrontBase64 = Buffer.from(idCardFront[1], "base64");
          const idCardFrontFilename = `${Date.now()}.png`;
          const idCardFrontFilePath = path.join(uploadDir, idCardFrontFilename);
          fs.writeFileSync(idCardFrontFilePath, idCardFrontBase64);
          const idCardBack = postData.idcardBack.split(";base64,");
          const idCardBackTypeAux = idCardBack[0].split("image/");
          const idCardBackType = idCardBackTypeAux[1];
          const idCardBackBase64 = Buffer.from(idCardBack[1], "base64");
          const idCardBackFilename = `${Date.now()}.png`;
          const idCardBackFilePath = path.join(uploadDir, idCardBackFilename);
          fs.writeFileSync(idCardBackFilePath, idCardBackBase64);
          id_front = idCardFrontFilename;
          id_back = idCardBackFilename;
        } else {
          res
            .status(400)
            .json({
              status: "error",
              message: "Invalid identity type selected.",
            });
        }

        const insertPackageResult = await Qry(
          "INSERT INTO `kyc`(`userid`, `id_front`, `id_back`, `address`, `type`, `date`, `fullname`, `phone`, `email`) VALUES (?,?,?,?,?,?,?,?,?)",
          [authUser, id_front, id_back, residentialAddress, identityType, todayDate, name, phone, email]
        );

        const updateUser = await Qry(
          "update usersdata set kyc_status = ? where id = ?",
          ["Uploaded", authUser]
        );
        if (
          insertPackageResult.affectedRows > 0 &&
          updateUser.affectedRows > 0
        ) {

   // Email variables
   const company = company_name;
   const verify_link = `https://adminhub.elevatedmarketplace.world/kycpending`;

   const title = "Kyc documents uploaded by " + userData?.username;
   const emailimg = emailImagesLink + "welcome.png";
   const heading = "Kyc Documents of " + userData?.username;
   const subheading = "";

   // Construct the email content
   const body = `
         <p style="text-align:left">New kyc documents submitted by user ${userData?.username} please click on below link to open admin portal </p>
 
         <p><a href="${verify_link}" style="padding: 10px 15px;display: inline-block;border-radius: 5px;background: #1a253a;color: #fff;" class="btn btn-primary">Open Admin Portal</a></p>
         

         <p  style="text-align:left">
         Thank you for choosing ${company}! <br>
 
         Best regards,<br>
         The ${company} Team
         </p>
       `;
   const mailOptions = {
     from: {
       name: "KYC Elevated Market Place",
       address: noreply_email,
     },
     to: {
       name: 'Seyandro',
       address: 'seansilva@elevatednations.world',
     },
     cc: {
      name: 'ID Verification',
      address: 'idverification@elevatednations.world',
    },
     subject:`Kyc documents uploaded (${userData?.username})`,
     html: emailTemplate(
       title,
       emailimg,
       heading,
       subheading,
       body,
       company_name
     ),
     text: body,
   };

   await transporter.sendMail(mailOptions, (err, info) => {});

          res.status(200).json({
            status: "success",
            message: "K.Y.C data uploaded successfully",
          });
        }
      }
    } catch (e) {
      res.status(500).json({ status: "error", message: e.message });
    }
  }
);
router.post("/binarypointsreport", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const pointsSelect = await Qry(`
      SELECT p.*, ud.username 
      FROM points p
      left join usersdata ud on p.sender_id = ud.id
      WHERE JSON_SEARCH(p.receiver_ids, 'one', '${authUser}', NULL, '$.receiver_ids')
      IS NOT NULL
      ORDER BY id DESC
    `);

      const pointsdbData = pointsSelect;
      const pointsarray = { entries: pointsdbData };

      if (pointsdbData.length > 0) {
        res.status(200).json({ status: "success", data: pointsarray });
      } else {
        pointsarray.entries = [];
        res.status(200).json({ status: "success", data: pointsarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/subscriptionreport", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const subscriptionSelect = await Qry(`
      SELECT * 
      FROM new_packages
      WHERE userid = '${authUser}'
    `);

      const subscriptiondbData = subscriptionSelect;
      const subscriptionarray = { entries: subscriptiondbData };

      if (subscriptiondbData.length > 0) {
        res.status(200).json({ status: "success", data: subscriptionarray });
      } else {
        subscriptionarray.entries = [];
        res.status(200).json({ status: "success", data: subscriptionarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/personalreferrals", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const referralSelect = await Qry(`
      SELECT username, firstname, lastname, status, country, mobile, email, leg_position, picture
      FROM usersdata
      WHERE sponsorid = '${authUser}'
      ORDER BY id DESC
    `);

      const referraldbData = referralSelect;
      const referralArray = { entries: referraldbData };

      if (referraldbData.length > 0) {
        referralArray.picturelink = `${backoffice_link}/backend_apis/views/uploads/userprofile/`;
        res.status(200).json({ status: "success", data: referralArray });
      } else {
        const referralArray = { entries: [] };
        res
          .status(200)
          .json({
            status: "error",
            data: referralArray,
            message: "no referral found",
          });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/residuelreport", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const residuelSelect = await Qry(`
      SELECT tr.*, ra.name 
      FROM transaction tr
      left join rank ra on tr.rankid = ra.id
      WHERE receiverid = '${authUser}' and
      type = 'Binary Bonus'
      ORDER BY id DESC
    `);

      const residueldbData = residuelSelect;
      const residuelArray = { entries: residueldbData };

      if (residueldbData.length > 0) {
        res.status(200).json({ status: "success", data: residuelArray });
      } else {
        const residuelArray = { entries: [] };
        res
          .status(200)
          .json({
            status: "error",
            data: residuelArray,
            message: "no referral found",
          });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//get settings data
router.post("/getsettingsdata", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const keynames = postData.keynames;

  try {
    const authUser = await checkAuthorization(req, res);
    const settingslist = {};
    if (authUser) {
      const settingSelectQuery = `SELECT * FROM setting WHERE keyname IN (${keynames})`;
      const settingSelectResult = await Qry(settingSelectQuery);
      const settingsdbData = settingSelectResult;

      settingslist["values"] = settingsdbData;

      if (Object.keys(settingslist).length > 0) {
        res.json({
          status: "success",
          data: settingslist,
        });
      }
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});
//payout request

router.post("/payoutrequest", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      let amount = CleanHTMLData(CleanDBData(postData.amount));
      const payoutaccount1 = CleanHTMLData(
        CleanDBData(postData.payoutaccount1)
      );
      const payoutaccount2 = CleanHTMLData(
        CleanDBData(postData.payoutaccount2)
      );
      const type = CleanHTMLData(CleanDBData(postData.type));
      const status = CleanHTMLData(CleanDBData(postData.status));

      const settingsData = await Qry(
        "SELECT * FROM `setting` WHERE keyname IN (?, ?, ?)",
        ["payout_fee", "min_payout", "payout_flat_fee"]
      );

      const payout_fee = settingsData[0].keyvalue;
      const min_payout = settingsData[1].keyvalue;
      const payout_flat_fee = settingsData[2].keyvalue;

      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [authUser]);
      const userData = selectUserResult[0];

      if (amount > userData.current_balance) {
        res.status(200).json({
          status: "error",
          message:
            "Invalid amount. You have only $" +
            userData.current_balance +
            " in your E-Wallet",
        });
        return;
      }
      
      if(userData.kyc_status !== "Verified")
      {
        res.status(200).json({
          status: "error",
          message:
            "Please verify your KYC first to get payout.",
        });
        return;
      }
      
      let amount1 = amount - amount * (payout_fee / 100) - payout_flat_fee;

      let message = `You have requested a withdrawal of $${amount}. After a ${payout_fee}% Payout Fee and a $${payout_flat_fee} network fee, your $${amount1} withdrawal is being processed.`;
      let details = `You have requested a withdrawal of $${amount}. After a ${payout_fee}% Payout Fee and a $${payout_flat_fee} network fee, your withdrawal amount is $${amount1}.`;

      const updateUserBalance = await Qry(
        "UPDATE usersdata set current_balance = current_balance - ? where id = ?",
        [amount, authUser]
      );

      const insertTransactionsResult = await Qry(
        "INSERT INTO `transaction` (`receiverid`, `senderid`, `amount`,`type`,`payoutaccount1`,`payoutaccount2`,`details`,`status`,`amount2`, createdat) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
          userData.id,
          0,
          amount1,
          type,
          payoutaccount1,
          userData?.walletaddress,
          details,
          "pending",
          amount,
          todayDate
        ]
      );
      res.status(200).json({
        status: "success",
        message: '',
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/payout", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      const payoutSelect = await Qry(`
      SELECT * 
      FROM withdrawal
      WHERE userid = '${authUser}'
    `);

      const payoutdbData = payoutSelect;
      const payoutarray = { entries: payoutdbData };

      if (payoutdbData.length > 0) {
        res.status(200).json({ status: "success", data: payoutarray });
      } else {
        payoutarray.entries = [];
        res.status(200).json({ status: "success", data: payoutarray });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/updatereferralside", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await checkAuthorization(req, res);
    if (authUser) {
      let side = postData.referral_side;

      if (side === "L" || side === "R") {
        const updateUserQuery = `UPDATE usersdata SET referral_side = ? WHERE id = ?`;
        const updateUserParams = [side, authUser];
        const updateUserResult = await Qry(updateUserQuery, updateUserParams);

        if (updateUserResult.affectedRows > 0) {
          res
            .status(200)
            .json({
              status: "success",
              message: "Referral side has been updated successfully",
            });
        } else {
          res
            .status(500)
            .json({
              status: "error",
              message: "Something went wrong. Please try again later.",
            });
        }
      } else {
        res
          .status(200)
          .json({ status: "error", message: "Invalid referral side." });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});


router.post('/transaction',upload.single("image"), async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const authUser = await checkAuthorization(req, res);
    let filename
    if (authUser) {

      if (postData.type === "deposit") {

        postData.senderid = authUser;
        postData.receiverid = 0;
        const uploadDir = path.join(__dirname,"../public/uploads/payments/");
        const imageParts = postData.payoutaccount2.split(";base64,");
        const imageTypeAux = imageParts[0].split("image/");
        const imageType = imageTypeAux[1];
        const imageBase64 = Buffer.from(imageParts[1], "base64");
      
        filename = `${Date.now()}.png`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, imageBase64);

        const selectUserQuery = 'SELECT * FROM usersdata WHERE id = ?';
        const selectUserResult = await Qry(selectUserQuery, [authUser]);
        const userData = selectUserResult[0];
        const decryptedPassword = crypto.AES.decrypt(userData.password, encryptionKey).toString(crypto.enc.Utf8);
        const passwordMatch = bcrypt.compareSync(postData.password, decryptedPassword);
    
        if (!passwordMatch) {
          res.json({
            status: 'error',
            message: 'Invalid account password',
          });
          return;
        }
      } 
      delete postData.password
      delete postData.payoutaccount2
      // Prepare data for insertion into the 'transaction' table
      const transactionData = {
        ...postData,
        payoutaccount2:filename,
        createdat: todayDate,
      };

      // Clean and insert the transaction data
      const keys = Object.keys(transactionData).filter(key => key !== 'password');
      const values = keys.map(key => CleanHTMLData(CleanDBData(transactionData[key])));
      const insertTransactionQuery = `INSERT INTO transaction(${keys.join(', ')}) VALUES (${values.map(() => '?').join(', ')})`;
      await Qry(insertTransactionQuery, values);

      // await Qry(`update usersdata set paymentstatus = ? where id = ?`,['submitted',authUser]);

      res.status(200).json({
        status: 'success',
        message: 'Transaction submitted successfully',
      });
    }
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});


// get deposit summary

router.post("/getdepositlist", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const status = postData.status;
    const authUser = await checkAuthorization(req, res);
    const transactionslist = { entries: [] };

    let statuscondition = "";
    if (status !== "all") {
      statuscondition = `AND t.status = '${status}'`;
    }

    if (authUser) {
      const query = `
        SELECT t.id as tid, u.username AS senderusername, t.amount, t.hash, t.createdat, t.approvedat, t.status, t.details, t.type, t.hash
        FROM transaction t
        LEFT JOIN usersdata u ON t.senderid = u.id
        WHERE t.type = 'deposit'
        ${statuscondition}
      `;

      const transactionSelect = await Qry(query);
      const transactionsdbData = transactionSelect;

      transactionslist.entries = transactionsdbData;

      res.status(200).json({
        status: "success",
        data: transactionslist,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// get reffrel bonus history

router.post("/referralbonussummary", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const GetReffrelBalannce = `SELECT t.amount, u.firstname,u.lastname, t.details, t.createdat
      FROM transaction t
      JOIN usersdata u ON t.receiverid = u.sponsorid
      WHERE t.type = 'referralbonus' AND t.receiverid = ${authUser}  and t.status = 'approved'
      `;
      const TotalReffrelBalance = await Qry(GetReffrelBalannce);

      res.json({
        status: "success",
        data: TotalReffrelBalance,
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

// get unlevel bonus history

router.post("/unilevelbonussummary", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const GetUniLevelBalannce = `SELECT t.amount, u.firstname,u.lastname, t.details, t.createdat
      FROM transaction t
      JOIN usersdata u ON u.sponsorid = t.receiverid
      WHERE t.type = 'unilevelbonus' AND t.receiverid = ${authUser}  and t.status = 'approved'
      `;
      const TotalUniLevelBalance = await Qry(GetUniLevelBalannce);

      res.json({
        status: "success",
        data: TotalUniLevelBalance,
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



// get stockist bonus history

router.post("/stockistbonussummary", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const GetUniLevelBalannce = `SELECT t.amount, u.firstname,u.lastname, t.details, t.createdat
      FROM transaction t
      JOIN usersdata u ON u.sponsorid = t.receiverid
      WHERE t.type = 'unilevelbonus' AND t.receiverid = ${authUser}  and t.status = 'approved'
      `;
      const TotalUniLevelBalance = await Qry(GetUniLevelBalannce);

      res.json({
        status: "success",
        data: TotalUniLevelBalance,
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

// get payment  history

router.post("/paymentsummary", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const GetUniLevelBalannce = `SELECT t.amount, u.firstname, u.lastname, t.details, t.createdat
      FROM transaction t
      JOIN usersdata u ON t.receiverid = u.sponsorid
      WHERE t.type = 'payout' AND t.receiverid = ${authUser}`;
      const TotalUniLevelBalance = await Qry(GetUniLevelBalannce);

      res.json({
        status: "success",
        data: TotalUniLevelBalance,
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

router.post("/getbinarytree1", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res);
    const postData = req.body;
    const userrandomcode = postData.userrandomcode;
    const users = {};

    if (authUser) {
      const selectuserid = `SELECT * FROM usersdata WHERE randomcode = ?`;
      const selectres = await Qry(selectuserid, [userrandomcode]);
      const userid = selectres[0].id;
  
      const user1 = userid;
      const user1_data = (await getUserData(user1)).split("*");
      const [
        user1_username,
        user1_sponsorname,
        user1_randomcode,
        user1_picture,
        user1_fullname,
        user1_sponsorfullname,
        user1_total_left_points,
        user1_total_right_points,
        
      ] = user1_data;

      const level1_users = await getBinaryTreeUsers(user1);
      const user2 = level1_users[0]?.userid;
      const user3 = level1_users[1]?.userid;

      const level2_leg1_users = await getBinaryTreeUsers(user2);
      const user4 = level2_leg1_users[0]?.userid;
      const user5 = level2_leg1_users[1]?.userid;

      const level2_leg2_users = await getBinaryTreeUsers(user3);
      const user6 = level2_leg2_users[0]?.userid;
      const user7 = level2_leg2_users[1]?.userid;

      const level3_leg1_users = await getBinaryTreeUsers(user4);
      const user8 = level3_leg1_users[0]?.userid;
      const user9 = level3_leg1_users[1]?.userid;

      const level3_leg2_users = await getBinaryTreeUsers(user5);
      const user10 = level3_leg2_users[0]?.userid;
      const user11 = level3_leg2_users[1]?.userid;

      const level3_leg3_users = await getBinaryTreeUsers(user6);
      const user12 = level3_leg3_users[0]?.userid;
      const user13 = level3_leg3_users[1]?.userid;

      const level3_leg4_users = await getBinaryTreeUsers(user7);
      const user14 = level3_leg4_users[0]?.userid;
      const user15 = level3_leg4_users[1]?.userid;

      const user2_data = (await getUserData(user2)).split("*");
      const [
        user2_username,
        user2_sponsorname,
        user2_randomcode,
        user2_picture,
        user2_fullname,
        user2_sponsorfullname,
        user2_total_left_points,
        user2_total_right_points,
        
      ] = user2_data;

      const user3_data = (await getUserData(user3)).split("*");
      const [
        user3_username,
        user3_sponsorname,
        user3_randomcode,
        user3_picture,
        user3_fullname,
        user3_sponsorfullname,
        user3_total_left_points,
        user3_total_right_points,
        
      ] = user3_data;

      const user4_data = (await getUserData(user4)).split("*");
      const [
        user4_username,
        user4_sponsorname,
        user4_randomcode,
        user4_picture,
        user4_fullname,
        user4_sponsorfullname,
        user4_total_left_points,
        user4_total_right_points,
        
      ] = user4_data;

      const user5_data = (await getUserData(user5)).split("*");
      const [
        user5_username,
        user5_sponsorname,
        user5_randomcode,
        user5_picture,
        user5_fullname,
        user5_sponsorfullname,
        user5_total_left_points,
        user5_total_right_points,
        
      ] = user5_data;

      const user6_data = (await getUserData(user6)).split("*");
      const [
        user6_username,
        user6_sponsorname,
        user6_randomcode,
        user6_picture,
        user6_fullname,
        user6_sponsorfullname,
        user6_total_left_points,
        user6_total_right_points,
        
      ] = user6_data;

      const user7_data = (await getUserData(user7)).split("*");
      const [
        user7_username,
        user7_sponsorname,
        user7_randomcode,
        user7_picture,
        user7_fullname,
        user7_sponsorfullname,
        user7_total_left_points,
        user7_total_right_points,
        
      ] = user7_data;

      const user8_data = (await getUserData(user8)).split("*");
      const [
        user8_username,
        user8_sponsorname,
        user8_randomcode,
        user8_picture,
        user8_fullname,
        user8_sponsorfullname,
        user8_total_left_points,
        user8_total_right_points,
        
      ] = user8_data;

      const user9_data = (await getUserData(user9)).split("*");
      const [
        user9_username,
        user9_sponsorname,
        user9_randomcode,
        user9_picture,
        user9_fullname,
        user9_sponsorfullname,
        user9_total_left_points,
        user9_total_right_points,
        
      ] = user9_data;

      const user10_data = (await getUserData(user10)).split("*");
      const [
        user10_username,
        user10_sponsorname,
        user10_randomcode,
        user10_picture,
        user10_fullname,
        user10_sponsorfullname,
        user10_total_left_points,
        user10_total_right_points,
        
      ] = user10_data;

      const user11_data = (await getUserData(user11)).split("*");
      const [
        user11_username,
        user11_sponsorname,
        user11_randomcode,
        user11_picture,
        user11_fullname,
        user11_sponsorfullname,
        user11_total_left_points,
        user11_total_right_points,
        
      ] = user11_data;

      const user12_data = (await getUserData(user12)).split("*");
      const [
        user12_username,
        user12_sponsorname,
        user12_randomcode,
        user12_picture,
        user12_fullname,
        user12_sponsorfullname,
        user12_total_left_points,
        user12_total_right_points,
        
      ] = user12_data;

      const user13_data = (await getUserData(user13)).split("*");
      const [
        user13_username,
        user13_sponsorname,
        user13_randomcode,
        user13_picture,
        user13_fullname,
        user13_sponsorfullname,
        user13_total_left_points,
        user13_total_right_points,
        
      ] = user13_data;

      const user14_data = (await getUserData(user14)).split("*");
      const [
        user14_username,
        user14_sponsorname,
        user14_randomcode,
        user14_picture,
        user14_fullname,
        user14_sponsorfullname,
        user14_total_left_points,
        user14_total_right_points,
        
      ] = user14_data;

      const user15_data = (await getUserData(user15)).split("*");
      const [
        user15_username,
        user15_sponsorname,
        user15_randomcode,
        user15_picture,
        user15_fullname,
        user15_sponsorfullname,
        user15_total_left_points,
        user15_total_right_points,
        
      ] = user15_data;

      users.user1 = {
        username: user1_username,
        sponsorname: user1_sponsorname,
        randomcode: user1_randomcode,
        profilepicture: user1_picture,
        fullname: user1_fullname,
        sponsorfullname: user1_sponsorfullname,
        total_left_points: user1_total_left_points,
        total_right_points: user1_total_right_points
        
      };

      users.user2 = {
        username: user2_username,
        sponsorname: user2_sponsorname,
        randomcode: user2_randomcode,
        profilepicture: user2_picture,
        fullname: user2_fullname,
        sponsorfullname: user2_sponsorfullname,
        total_left_points: user2_total_left_points,
        total_right_points: user2_total_right_points
        
      };

      users.user3 = {
        username: user3_username,
        sponsorname: user3_sponsorname,
        randomcode: user3_randomcode,
        profilepicture: user3_picture,
        fullname: user3_fullname,
        sponsorfullname: user3_sponsorfullname,
        total_left_points: user3_total_left_points,
        total_right_points: user3_total_right_points
        
      };

      users.user4 = {
        username: user4_username,
        sponsorname: user4_sponsorname,
        randomcode: user4_randomcode,
        profilepicture: user4_picture,
        fullname: user4_fullname,
        sponsorfullname: user4_sponsorfullname,
        total_left_points: user4_total_left_points,
        total_right_points: user4_total_right_points
        
      };

      users.user5 = {
        username: user5_username,
        sponsorname: user5_sponsorname,
        randomcode: user5_randomcode,
        profilepicture: user5_picture,
        fullname: user5_fullname,
        sponsorfullname: user5_sponsorfullname,
        total_left_points: user5_total_left_points,
        total_right_points: user5_total_right_points
        
      };

      users.user6 = {
        username: user6_username,
        sponsorname: user6_sponsorname,
        randomcode: user6_randomcode,
        profilepicture: user6_picture,
        fullname: user6_fullname,
        sponsorfullname: user6_sponsorfullname,
        total_left_points: user6_total_left_points,
        total_right_points: user6_total_right_points
        
      };

      users.user7 = {
        username: user7_username,
        sponsorname: user7_sponsorname,
        randomcode: user7_randomcode,
        profilepicture: user7_picture,
        fullname: user7_fullname,
        sponsorfullname: user7_sponsorfullname,
        total_left_points: user7_total_left_points,
        total_right_points: user7_total_right_points
        
      };

      users.user8 = {
        username: user8_username,
        sponsorname: user8_sponsorname,
        randomcode: user8_randomcode,
        profilepicture: user8_picture,
        fullname: user8_fullname,
        sponsorfullname: user8_sponsorfullname,
        total_left_points: user8_total_left_points,
        total_right_points: user8_total_right_points
        
      };

      users.user9 = {
        username: user9_username,
        sponsorname: user9_sponsorname,
        randomcode: user9_randomcode,
        profilepicture: user9_picture,
        fullname: user9_fullname,
        sponsorfullname: user9_sponsorfullname,
        total_left_points: user9_total_left_points,
        total_right_points: user9_total_right_points
        
      };

      users.user10 = {
        username: user10_username,
        sponsorname: user10_sponsorname,
        randomcode: user10_randomcode,
        profilepicture: user10_picture,
        fullname: user10_fullname,
        sponsorfullname: user10_sponsorfullname,
        total_left_points: user10_total_left_points,
        total_right_points: user10_total_right_points,
        
      };

      users.user11 = {
        username: user11_username,
        sponsorname: user11_sponsorname,
        randomcode: user11_randomcode,
        profilepicture: user11_picture,
        fullname: user11_fullname,
        sponsorfullname: user11_sponsorfullname,
        total_left_points: user11_total_left_points,
        total_right_points: user11_total_right_points,
        
      };

      users.user12 = {
        username: user12_username,
        sponsorname: user12_sponsorname,
        randomcode: user12_randomcode,
        profilepicture: user12_picture,
        fullname: user12_fullname,
        sponsorfullname: user12_sponsorfullname,
        total_left_points: user12_total_left_points,
        total_right_points: user12_total_right_points,
        
      };

      users.user13 = {
        username: user13_username,
        sponsorname: user13_sponsorname,
        randomcode: user13_randomcode,
        profilepicture: user13_picture,
        fullname: user13_fullname,
        sponsorfullname: user13_sponsorfullname,
        total_left_points: user13_total_left_points,
        total_right_points: user13_total_right_points,
        
      };

      users.user14 = {
        username: user14_username,
        sponsorname: user14_sponsorname,
        randomcode: user14_randomcode,
        profilepicture: user14_picture,
        fullname: user14_fullname,
        sponsorfullname: user14_sponsorfullname,
        total_left_points: user14_total_left_points,
        total_right_points: user14_total_right_points,
        
      };

      users.user15 = {
        username: user15_username,
        sponsorname: user15_sponsorname,
        randomcode: user15_randomcode,
        profilepicture: user15_picture,
        fullname: user15_fullname,
        sponsorfullname: user15_sponsorfullname,
        total_left_points: user15_total_left_points,
        total_right_points: user15_total_right_points,
        
      };

      users.picturelink = `${backoffice_link}uploads/userprofile/`;

      if (Object.keys(users).length > 0) {
        res.status(200).json({
          status: "success",
          data: users,
        });
      } else {
        res.status(200).json({
          status: "error",
          message: "No data found",
        });
      }
    }
  } catch (e) {
    console.log(e)
    res.status(500).json({ status: "error", message: e.message });
  }
});

router.post("/getbinarytree", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
      const authUser = await checkAuthorization(req, res);
      const postData = req.body;
      const userrandomcode = postData.userrandomcode;
      const users = {};

      if (authUser) {
          const selectuserid = `SELECT * FROM usersdata WHERE randomcode = ?`;
          const selectres = await Qry(selectuserid, [userrandomcode]);
          const userid = selectres[0].id;

          const user1 = userid;
          const user1_data = (await getUserData(user1)).split("*");
          const userKeys = [
              "username",
              "sponsorname",
              "randomcode",
              "picture",
              "fullname",
              "sponsorfullname",
              "total_left_points",
              "total_right_points",
              "investment"
          ];

          // Attach user1 data to users
          const user1Obj = {};
          user1_data.forEach((value, index) => {
              user1Obj[userKeys[index]] = value;
          });
          users.user1 = user1Obj;

          const level1_users = await getBinaryTreeUsers(user1);

          for (let i = 0; i < Math.min(level1_users.length, 15); i++) {
              const userData = (await getUserData(level1_users[i])).split("*");
              const user = {};
              userData.forEach((value, index) => {
                  user[userKeys[index]] = value;
              });
              users[`user${i + 2}`] = user;
          }

          users.picturelink = `${backoffice_link}uploads/userprofile/`;

          if (Object.keys(users).length > 0) {
              res.status(200).json({
                  status: "success",
                  data: users,
              });
          } else {
              res.status(200).json({
                  status: "error",
                  message: "No data found",
              });
          }
      }
  } catch (e) {
      console.log(e)
      res.status(500).json({ status: "error", message: e.message });
  }
});


router.post("/getcountries", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
      const countrySelectResult = await Qry(
        `SELECT id,name,iso2,iso3,phonecode FROM countries  order by name asc`
      );
      if (countrySelectResult.length > 0) {
        res.json({
          status: "success",
          data: countrySelectResult,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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

router.post("/getpackageslist", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const packageSelectResult = await Qry(
        `SELECT * from packages order by id asc`
      );
      if (packageSelectResult.length > 0) {
        res.json({
          status: "success",
          data: packageSelectResult,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
        });
      }
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/getstates", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const countryid = CleanHTMLData(CleanDBData(postData.countryid));

  try {

      const statesSelectResult = await Qry(
        `SELECT id,name FROM states where country_id = ?  order by name asc`, [countryid]
      );
      if (statesSelectResult.length > 0) {
        res.json({
          status: "success",
          data: statesSelectResult,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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

router.post("/getcities", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const stateid = CleanHTMLData(CleanDBData(postData.stateid));

  try {

      const citiesSelectResult = await Qry(
        `SELECT id,name FROM cities where state_id = ?  order by name asc`, [stateid]
      );
      if (citiesSelectResult.length > 0) {
        res.json({
          status: "success",
          data: citiesSelectResult,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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



router.post("/getstockistlist", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const cityid = CleanHTMLData(CleanDBData(postData.cityid));

  try {
      const authUser = await checkAuthorization(req, res); 

      const stockistData = await Qry(`SELECT id as stockistid,firstname,lastname,address,storename from usersdata  where city = ? and stockist = ?`, [cityid, 'enable']);

      
      if (stockistData.length > 0) {

        res.json({
          status: "success",
          data: stockistData,

        });
      } else {
        res.json({
          status: "error",
          data: [],
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

router.post("/getshippingcharges", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const countryid = CleanHTMLData(CleanDBData(postData?.countryid));
  const stateid = CleanHTMLData(CleanDBData(postData?.stateid));
  const cityid = CleanHTMLData(CleanDBData(postData?.cityid));
  const totalWeight = CleanHTMLData(CleanDBData(postData?.totalWeight));

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      //console.log(`select amount from shipppingcost where country_id = ${countryid} and state_id = ${stateid} and city_id = ${cityid} `)
      const selectCharges = await Qry(
        `select amount,amountkg from shipppingcost where country_id = ? and state_id = ? and city_id = ? `,
        [countryid, stateid, cityid]
      );

      if (selectCharges.length > 0) {
        let shippingCost;
        if (totalWeight > 0) {
          shippingCost = selectCharges[0].amountkg * totalWeight;
        } else {
          shippingCost = selectCharges[0].amount;
        }
        res.json({
          status: "success",
          data: shippingCost,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
        });
      }
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});







router.post("/getuserpackagedetails", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    if (authUser) {
      const postData = req.body;
      const pkgid = CleanHTMLData(CleanDBData(postData.pkgid));
      const packageSelectResult = await Qry(`select * from packages where id = ?`, [pkgid]);
      if (packageSelectResult.length > 0) {
        res.json({
          status: "success",
          data: packageSelectResult[0],
        });
      } else {
        res.json({
          status: "error",
          message: `no package found`,
        });
      }
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


router.post("/getadminwallet", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const keynames = req.body.keynames;
    const userslist = [];
    const usersdata = {};


      const userSelect = await Qry(
        "SELECT id AS tid, keyname, keyvalue FROM setting WHERE keyname IN (" +
          keynames +
          ")"
      );
      const rows = userSelect;

      for (const row of rows) {
        const user = JSON.parse(row.keyvalue);
        user.tid = row.tid; // Add the 'tid' column to the decoded user object
        userslist.push(user);
      }

      usersdata.entries = userslist;

      if (!userslist.length) {
        usersdata.entries = [];
      }

      res.json({
        status: "success",
        data: usersdata,
      });
    
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/getsingledepositwallet", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const tid = req.body.tid;
    const userslist = [];
    const usersdata = {};

      const userSelect = await Qry(
        "SELECT id AS tid, keyname, keyvalue FROM setting WHERE id = ?",
        [tid]
      );
      const row = userSelect[0];

      const user = JSON.parse(row.keyvalue);
      user.tid = row.tid; // Add the 'tid' column to the decoded user object
      userslist.push(user);
      usersdata.entries = userslist;
      usersdata.picturelink = `${backoffice_link}/uploads/walletqr/`;
      res.json({
        status: "success",
        data: usersdata,
      });
    
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});



//update profile password
router.post("/balancetransfer", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
    const password = CleanHTMLData(CleanDBData(postData.password));
    const fromwallet = CleanHTMLData(CleanDBData(postData.fromwallet));
    const towallet = CleanHTMLData(CleanDBData(postData.towallet));
    const amount = CleanHTMLData(CleanDBData(postData.amount));
    let fromWalletName, toWalletName
    if(fromwallet === "current_balance"){fromWalletName = "Bonus Wallet"}
    if(fromwallet === "deposit_balance"){fromWalletName = "Purchasing Wallet"}
    if(fromwallet === "stockist_balance"){fromWalletName = "Stockist Wallet"}

    if(towallet === "current_balance"){toWalletName = "Bonus Wallet"}
    if(towallet === "deposit_balance"){toWalletName = "Purchasing Wallet"}
    if(towallet === "stockist_balance"){toWalletName = "Stockist Wallet"}

    
    if (authUser) {
      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [authUser]);
      const userData = selectUserResult[0];
      const walletBalance = userData[fromwallet]
      // Generate a salt for password hashing
      const saltRounds = 16; // The number of salt rounds determines the complexity of the hashing
      const salt = bcrypt.genSaltSync(saltRounds);

      const options = {
        cost: 12, // Specify the hashing cost (higher cost means more secure but slower)
        salt: salt, // Pass the generated salt
      };
      const decryptedPassword = crypto.AES.decrypt(
        userData.password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(password, decryptedPassword);

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Incorrect account password",
        });
        return;
      }

      if(walletBalance < amount)
      {
        res.json({
          status: "error",
          message: "Insufficient wallet balance",
        });
        return;
      }

      const updateQuery = `UPDATE usersdata SET ${fromwallet} = ${fromwallet} - ?, ${towallet} = ${towallet} + ? WHERE id = ?`;
      const updateParams = [amount,amount, authUser];
      const updateResult = await Qry(updateQuery, updateParams);

      await Qry(`insert into transaction ( receiverid, senderid, amount, type, details,createdat) values ( ? , ? , ? ,? , ?,?)`,[authUser, authUser,amount,'wallettransfer',`successfully transfered amount N(${amount}) from ${fromWalletName} to ${toWalletName}`, todayDate])

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Balance transfered successfully",
        });
        return
      }
    }
  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


//nft endpoints

router.post("/getcollection", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;
  const nextId = CleanHTMLData(CleanDBData(postData.nextId));
  const limit = CleanHTMLData(CleanDBData(postData.limit));
  const collectionSlug = CleanHTMLData(CleanDBData(postData.collectionSlug));

  // sdk.list_nfts_by_account({
  //   next: nextId,
  //   limit: limit, 
  //   chain: 'matic', 
  //   address: '0xE856D04497b8B1EB1A7b6a7D16734925e74B97E2'
  // })
  sdk.list_nfts_by_collection({
    collection_slug: collectionSlug,
    next: nextId || '',
    limit: limit, 
    // chain: 'matic', 
    // address: '0xE856D04497b8B1EB1A7b6a7D16734925e74B97E2'
  })
  .then(({ data }) => {
    res.status(200).json({
      status:"success",
      data:data
    })
  })
  .catch(err => {
    console.log(err)
    res.json({
      status:"error",
      message:err
    })
  });

});
//get user collection

//collection details
router.post("/getcollectiondetails", async (req, res) => {

      const postData = req.body;
      const collectionSlug = CleanHTMLData(CleanDBData(postData.collectionSlug));
try{
      const collectionData = await Qry(`select * from packages where collection = ?`,[collectionSlug])
      
        res.json({
          status:"error",
          data:collectionData[0]
        })
      }
      catch(e){
        res.json({
          status:"error",
          message:e.message
        })
      }
    
    });


router.post("/getusercollection", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;

  try {
    const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token

    const selectNftQuery =
      "SELECT * FROM usernfts WHERE userid = ?";
    const selectNftResult = await Qry(selectNftQuery, [authUser]);
    let nftData 
    if(selectNftResult.length > 0)
    {
      nftData = selectNftResult;
    }else{
      nftData = []
    }

    res.json({
          status: "success",
          data:nftData,
        });

  } catch (error) {
    console.log("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


//old api ipn

router.post("/oldipn", async (req, res) => {
const todayDate = await getCurrentTime();

  const postData = req.body;

  const insertDummyQry = `insert into dummy(d_data) values (?)`;
  await Qry(insertDummyQry, JSON.stringify(postData));
  try{

    const tokenSymbol = postData?.payload?.payment_token?.symbol
    const tokenUsdPrice = postData?.payload?.payment_token?.usd_price
    const tokenDecimals = postData?.payload?.payment_token?.decimals

    const receiverAddress = postData?.payload?.taker?.address
    const  transactionId = postData?.payload?.transaction?.hash
    const  SalePriceInTokenSmallestUnit = postData?.payload?.sale_price

    const itemChain = postData?.payload?.item?.chain?.name
    const itemName = postData?.payload?.item?.metadata?.name
    const itemImageUrl = postData?.payload?.item?.metadata?.image_url
    const permaLink = postData?.payload?.item?.permalink
    const nftId = postData?.payload?.item?.nft_id

    const SalePriceInToken = await weiToEther(SalePriceInTokenSmallestUnit, tokenDecimals)
    const SalePriceInUsd = Math.round(SalePriceInToken*tokenUsdPrice)

    let tempPriceInUsd

    if (SalePriceInUsd>500){
      tempPriceInUsd =490
      }
      else{
        tempPriceInUsd = SalePriceInUsd
      }

    const userSelect = await Qry(`SELECT * FROM usersdata WHERE walletaddress = ?`, [receiverAddress]);
    if(userSelect.length > 0)
    {

    const userdbData = userSelect[0];
    const authUser = userdbData?.id
    const username =  userdbData?.username
    let sponsorid = userdbData?.sponsorid
    let pid = userdbData?.pid || 2
    const userStatus = userdbData?.status


    const selectPkg = await Qry(`select * from packages where amount >= ? and ? >= 250 and ? <= 25500 order by id asc limit 1`,[SalePriceInUsd, SalePriceInUsd,SalePriceInUsd])

      if(selectPkg.length > 0)
      {
        const pkgId = selectPkg[0].id
        if(sponsorid !== undefined || sponsorid !== null || sponsorid !== "")
        {

          if(userStatus === 'pending')
          {
            const placementUser = await findAvailableSpace(pid,userdbData?.referral_side)
            const insertTree = await Qry(`insert into binarytree(userid,pid,leg,status,createdat) values (?,?,?,?,?)`,[authUser, placementUser,userdbData?.referral_side,'active',todayDate])
          }
        }

        await Qry("update usersdata set investment = investment + ?, pkgid = ?, status = ? where id = ?", [SalePriceInUsd,pkgId, 'approved', authUser])
        await Qry("update binarytree set investment = investment + ?, updatedat = ? where userid = ?", [SalePriceInUsd,todayDate, authUser])

        await Qry("insert into transaction ( receiverid, senderid, amount, type, details,createdat) values ( ? , ? , ? ,? , ?, ?)", [0, authUser, SalePriceInUsd, 'investment', 'investment', todayDate])

        //package history
        await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [authUser, pkgId, transactionId, SalePriceInUsd, 'approved', 'package', todayDate])

        await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, walletaddress, title) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, authUser, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,receiverAddress,itemName ])

        
        const selectLeftBinaryPointsUsers = await Qry("WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg`, `investment`FROM `binarytree`WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg`, bt.`investment`FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid` ) SELECT ut.*, bt_parent.`investment` AS parent_investment FROM UserTree ut LEFT JOIN `binarytree` bt_parent ON ut.`pid` = bt_parent.`userid` WHERE ut.leg = ?    AND bt_parent.`investment` >= ?", [authUser, 'L', tempPriceInUsd]);
        const leftreceiverIds = selectLeftBinaryPointsUsers.map((row) => row.pid);
        let leftDataToInsert = JSON.stringify({ receiver_ids: leftreceiverIds });

        const selectRightBinaryPointsUsers = await Qry("WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg`, `investment`FROM `binarytree`WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg`, bt.`investment`FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid` ) SELECT ut.*, bt_parent.`investment` AS parent_investment FROM UserTree ut LEFT JOIN `binarytree` bt_parent ON ut.`pid` = bt_parent.`userid` WHERE ut.leg = ?    AND bt_parent.`investment` >= ?", [authUser, 'R', tempPriceInUsd]);
        const rightreceiverIds = selectRightBinaryPointsUsers.map((row) => row.pid);
        let rightDataToInsert = JSON.stringify({ receiver_ids: rightreceiverIds });


        const selectLeftBinaryPointsPendingUsers = await Qry("WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg`, `investment`FROM `binarytree`WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg`, bt.`investment`FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid` ) SELECT ut.*, bt_parent.`investment` AS parent_investment FROM UserTree ut LEFT JOIN `binarytree` bt_parent ON ut.`pid` = bt_parent.`userid` WHERE ut.leg = ?    AND bt_parent.`investment` < ?", [authUser, 'L', tempPriceInUsd]);

        const selectRightBinaryPointsUsersPending = await Qry("WITH RECURSIVE UserTree AS (SELECT `id`, `userid`, `pid`, `leg`, `investment`FROM `binarytree`WHERE `userid` = ? UNION ALL SELECT bt.`id`, bt.`userid`, bt.`pid`, bt.`leg`, bt.`investment`FROM `binarytree` bt JOIN UserTree ut ON bt.`userid` = ut.`pid` ) SELECT ut.*, bt_parent.`investment` AS parent_investment FROM UserTree ut LEFT JOIN `binarytree` bt_parent ON ut.`pid` = bt_parent.`userid` WHERE ut.leg = ?    AND bt_parent.`investment` < ?", [authUser, 'R', tempPriceInUsd]);

        selectLeftBinaryPointsPendingUsers.map(async (udata)=>{
          await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, udata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'L'])
        })
        
        selectRightBinaryPointsUsersPending.map(async (udata)=>{
          await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, udata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'R'])
        })


        
        if (leftreceiverIds.length > 0) {
          commaSeparatedLeftIds = leftreceiverIds.map(id => `'${id}'`).join(',');
        //update left points
        await Qry(`update binarytree set left_points = left_points + ?, total_left_points = total_left_points + ?, updatedat = ? where userid IN (${commaSeparatedLeftIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])

        await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'L', 'Binary Points', leftDataToInsert, todayDate]);
        } else {
          leftDataToInsert = null
        }

        if (rightreceiverIds.length > 0) {
          commaSeparatedRightIds = rightreceiverIds.map(id => `'${id}'`).join(',');

        //update right points
        await Qry(`update binarytree set right_points = right_points + ?, total_right_points = total_right_points + ?, updatedat = ? where userid IN (${commaSeparatedRightIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])

        await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'R', 'Binary Points', rightDataToInsert, todayDate]);
        } else {
          rightDataToInsert = null
        }


        const settingsData = await Qry("SELECT * FROM `setting` WHERE keyname IN (?, ?, ?, ?, ?, ?, ?, ?, ?)", ['referral_commission_status', 'referral_commission_type', 'referral_commission_value', 'unilevel_status', 'unilevel_bonus_level1', 'unilevel_bonus_level2', 'unilevel_bonus_level3', 'unilevel_bonus_level4', 'unilevel_bonus_level5']);

        const referralCommissionType = settingsData[0].keyvalue
        const referralCommissionValue = settingsData[1].keyvalue
        const referralCommissionStatus = settingsData[2].keyvalue
        const uniLevelStatus = settingsData[3].keyvalue
        let commissionAmount

        if (referralCommissionStatus === 'On') {
          referralCommissionType === 'Percentage' ?
            commissionAmount = (referralCommissionValue / 100) * SalePriceInUsd
            : referralCommissionType === 'Flat' ?
              commissionAmount = referralCommissionValue
              :
              commissionAmount = 0
          if (commissionAmount > 0) {
            updateSponsorBalance = await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [commissionAmount, sponsorid])

            insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details, createdat) values ( ? , ? , ? ,? , ?, ?)", [sponsorid, authUser, commissionAmount, 'referralbonus', referralCommissionType, todayDate])
          }
        }


        let bonusValue, bonusType, bonusDetails;
        let x = 4;
        let level = 1
        let totalInvestment
        if (uniLevelStatus === 'On') {
       
          while (x <= 8 && sponsorid !== null && sponsorid !== undefined) {
            const sidData = await Qry(
              'SELECT * FROM usersdata WHERE id = ?',
              [sponsorid]
            );
            sponsorid = sidData[0]?.sponsorid;
            const sidData1 = await Qry(
              'SELECT * FROM usersdata WHERE id = ?',
              [sponsorid]
            );
            totalInvestment = sidData1[0]?.investment 

     
            bonusType = "unilevelbonus";
            bonusDetails = `Received Level ${level} commission from user ${username}`;
            
            const bonusPercentage = settingsData[x].keyvalue;
            bonusValue = (bonusPercentage / 100) * SalePriceInUsd;
            if(bonusValue > 0 && totalInvestment >= 490 && (sponsorid !== null && sponsorid !== undefined))
            {
              // updateSponsorBalance = await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [bonusValue, sponsorid])
  
              insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details,status, createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [sponsorid, authUser, bonusValue, 'unilevelbonus', `Received Level ${level} commission from user ${username}`, 'pending', todayDate])
            }
           


            x++
            level++
          }
        }

      }
      else{

        await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, `details`, walletaddress, title) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, authUser, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,'package not found',receiverAddress,itemName ])

        await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [authUser, null, transactionId, SalePriceInUsd, 'pending', 'package', todayDate])

      }

  }
  else{

    await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, `details`,walletaddress, title) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, null, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,'no user found with this address',receiverAddress,itemName ])

    await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [null, null, transactionId, SalePriceInUsd, 'pending', 'package', todayDate])

  }
  res.status(200).json({
    status:"success"
  })
}
  catch (error) {
    console.log(error)
    res.status(500).json({
      status:"error",
      error
    })
  }

});

//api ipn

router.post("/nftSaleEventipn", async (req, res) => {
  const todayDate = await getCurrentTime();

const postData = req.body;
const insertDummyQry = `insert into dummy(d_data) values (?)`;
await Qry(insertDummyQry, JSON.stringify(postData));
try{

  const tokenSymbol = postData?.payload?.payment_token?.symbol
  const tokenUsdPrice = postData?.payload?.payment_token?.usd_price
  const tokenDecimals = postData?.payload?.payment_token?.decimals

  const receiverAddress = postData?.payload?.taker?.address
  const  transactionId = postData?.payload?.transaction?.hash
  const  SalePriceInTokenSmallestUnit = postData?.payload?.sale_price

  const itemChain = postData?.payload?.item?.chain?.name
  const itemName = postData?.payload?.item?.metadata?.name
  const itemImageUrl = postData?.payload?.item?.metadata?.image_url
  const permaLink = postData?.payload?.item?.permalink
  const nftId = postData?.payload?.item?.nft_id

  const SalePriceInToken = await weiToEther(SalePriceInTokenSmallestUnit, tokenDecimals)
  const SalePriceInUsd = Math.round(SalePriceInToken*tokenUsdPrice)

  await Qry(`update setting set keyvalue = ? where keyname = ?`, [tokenUsdPrice, 'maticprice'])
  let tempPriceInUsd

  if (SalePriceInUsd>500){
    tempPriceInUsd =490
    }
    else{
      tempPriceInUsd = SalePriceInUsd
    }
    const userNft = await Qry(`SELECT * FROM usernfts WHERE transactionid = ?`, [transactionId]);
    if(userNft.length < 1)
    {

    const userSelect = await Qry(`SELECT * FROM usersdata WHERE walletaddress = ?`, [receiverAddress]);
    if(userSelect.length > 0 && userSelect[0]?.status === "pending")
    {
  
      
  const userdbData = userSelect[0];
  const authUser = userdbData?.id
  const username =  userdbData?.username
  let sponsorid = userdbData?.sponsorid
  let pid = userdbData?.pid || 2
  const userStatus = userdbData?.status


  const selectPkg = await Qry(`select * from packages where amount >= ? and ? >= 250 and ? <= 25500 order by id asc limit 1`,[SalePriceInUsd, SalePriceInUsd,SalePriceInUsd])

    if(selectPkg.length > 0)
    {
      const pkgId = selectPkg[0]?.id
      if(sponsorid !== undefined || sponsorid !== null || sponsorid !== "")
      {

        if(userStatus === 'pending')
        {
          const placementUser = await findAvailableSpace(pid,userdbData?.referral_side)
          const insertTree = await Qry(`insert into binarytree(userid,pid,leg,status,createdat) values (?,?,?,?,?)`,[authUser, placementUser,userdbData?.referral_side,'active',todayDate])
        }
      }

      await Qry("update usersdata set investment = investment + ?, pkgid = ?, status = ? where id = ?", [SalePriceInUsd,pkgId, 'approved', authUser])
      await Qry("update binarytree set investment = investment + ?, updatedat = ? where userid = ?", [SalePriceInUsd,todayDate, authUser])

      await Qry("insert into transaction ( receiverid, senderid, amount, type, details,createdat) values ( ? , ? , ? ,? , ?, ?)", [0, authUser, SalePriceInUsd, 'investment', 'investment', todayDate])

      //package history
      await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [authUser, pkgId, transactionId, SalePriceInUsd, 'approved', 'package', todayDate])

      await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, walletaddress, title) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, authUser, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,receiverAddress,itemName ])


      const selectBinaryPointsUsers = await Qry(`WITH RECURSIVE upline AS (
        SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
               COALESCE(parent.investment, 0) AS parent_investment
        FROM binarytree bt
        LEFT JOIN binarytree parent ON bt.pid = parent.userid
        WHERE bt.userid = ?
        UNION ALL
        SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
               COALESCE(parent.investment, 0) AS parent_investment
        FROM binarytree bt
        JOIN upline u ON bt.userid = u.pid
        LEFT JOIN binarytree parent ON bt.pid = parent.userid
      )
      SELECT *
      FROM upline;
      `, [authUser]);


      const leftBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'L' && row?.parent_investment >= tempPriceInUsd && row?.pid !== null);
      const rightBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'R' && row?.parent_investment >= tempPriceInUsd && row?.pid !== null);

      const selectLeftBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'L' && row?.parent_investment < tempPriceInUsd  && row?.pid !== null);
      const selectRightBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row.leg === 'R' && row.parent_investment < tempPriceInUsd  && row?.pid !== null);

      const leftApprovedReceiverIds = leftBinaryPointsUsers.map(row => row?.pid);
      const rightApprovedReceiverIds = rightBinaryPointsUsers.map(row => row?.pid);

      let leftApprovedDataToInsert = JSON.stringify({ receiver_ids: leftApprovedReceiverIds });
      let rightApprovedDataToInsert = JSON.stringify({ receiver_ids: rightApprovedReceiverIds });

      // console.log('leftApproved', leftApprovedDataToInsert)
      // console.log('rightApproved', rightApprovedDataToInsert)

      // console.log('Pendingleft', PendingLeftDataToInsert)
      // console.log('Pendingright', PendingRightDataToInsert)
        
      if (leftApprovedReceiverIds.length > 0) {
        commaSeparatedLeftIds = leftApprovedReceiverIds.map(id => `'${id}'`).join(',');
      //update left points
      await Qry(`update binarytree set left_points = left_points + ?, total_left_points = total_left_points + ?, updatedat = ? where userid IN (${commaSeparatedLeftIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])

      await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'L', 'Binary Points', leftApprovedDataToInsert, todayDate]);
      } 

      if (rightApprovedReceiverIds.length > 0) {
        commaSeparatedRightIds = rightApprovedReceiverIds.map(id => `'${id}'`).join(',');
      //update right points
      await Qry(`update binarytree set right_points = right_points + ?, total_right_points = total_right_points + ?, updatedat = ? where userid IN (${commaSeparatedRightIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])

      await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'R', 'Binary Points', rightApprovedDataToInsert, todayDate]);
      } 


        
      selectLeftBinaryPointsPendingUsers.map(async (uidata)=>{
        await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'L'])
      })
      
      selectRightBinaryPointsPendingUsers.map(async (uidata)=>{
        await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'R'])
      })

 

      const settingsData = await Qry("SELECT * FROM `setting` WHERE keyname IN (?, ?, ?, ?, ?, ?, ?, ?, ?)", ['referral_commission_status', 'referral_commission_type', 'referral_commission_value', 'unilevel_status', 'unilevel_bonus_level1', 'unilevel_bonus_level2', 'unilevel_bonus_level3', 'unilevel_bonus_level4', 'unilevel_bonus_level5']);

      const referralCommissionType = settingsData[0]?.keyvalue
      const referralCommissionValue = settingsData[1]?.keyvalue
      const referralCommissionStatus = settingsData[2]?.keyvalue
      const uniLevelStatus = settingsData[3]?.keyvalue
      let commissionAmount

      if (referralCommissionStatus === 'On') {
        referralCommissionType === 'Percentage' ?
          commissionAmount = (referralCommissionValue / 100) * SalePriceInUsd
          : referralCommissionType === 'Flat' ?
            commissionAmount = referralCommissionValue
            :
            commissionAmount = 0
        if (commissionAmount > 0) {
          updateSponsorBalance = await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [commissionAmount, sponsorid])

          insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details, createdat) values ( ? , ? , ? ,? , ?, ?)", [sponsorid, authUser, commissionAmount, 'referralbonus', referralCommissionType, todayDate])
        }
      }


    }
    else{

      await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, `details`, walletaddress, title) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, authUser, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,'package not found',receiverAddress,itemName ])

      await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [authUser, null, transactionId, SalePriceInUsd, 'pending', 'package', todayDate])

    }
  }
  else{

    await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, `details`,walletaddress, title) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, null, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,'no user found with this address or already have the 1 nft limit',receiverAddress,itemName ])
  
    await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [null, null, transactionId, SalePriceInUsd, 'pending', 'package', todayDate])
  
  }
}

res.status(200).json({
  status:"success"
})
}
catch (error) {
  console.log(error)
  res.status(200).json({
    status:"error",
    error
  })
}

});



//update message status

router.post("/updatemessage", async (req, res) => {
const todayDate = await getCurrentTime();

  // Coinbase Commerce API credentials

 const postData = req.body;
 const msgId = CleanHTMLData(CleanDBData(postData.msgId));
 
   try {
     const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
 if(authUser)
 {
  const checkMessage = await Qry(`select * from messagestatus where messageid = ? and userid = ?`, [msgId, authUser])
  if(checkMessage.length <= 0)
  {
  await Qry(`update messages set status = ? where id = ? and receiver = ?`,['seen', msgId, authUser])
  await Qry(`insert into messagestatus(messageid,userid,createdat) values(?,?,?)`,[msgId, authUser, todayDate])
  }
  // Return charge information to the client
     res.json({status:"success",message:'status updated'});
   }
 } catch (error) {
     console.log('Error creating charge:', error);
     res.status(500).json({status:"error",data:error?.message});
 }
 
 });


//create charge


router.post("/createcharge", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    // Coinbase Commerce API credentials
   const apiKey = 'a68ae76f-e620-4b53-b173-9a18cf9664aa';
   const apiUrl = 'https://api.commerce.coinbase.com';
   const postData = req.body;
   const amount = CleanHTMLData(CleanDBData(postData.amount));
   
     try {
       const authUser = await checkAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
   if(authUser)
   {
      const userSelect = await Qry(`SELECT * FROM usersdata WHERE id = ?`, [authUser]);
      if(userSelect.length > 0)
      {
          // Data to create a charge
          const postData = {
            name: userSelect[0]?.username,
            cancel_url: "https://dashboard.elevatedmarketplace.world/payment/cancel/",
            redirect_url: "https://dashboard.elevatedmarketplace.world/payment/success/",
            description: `Upgrade Package of user ${userSelect[0]?.username}`,
            local_price: {
                amount: amount,
                currency: 'USD'
            },
            pricing_type: 'fixed_price',
            metadata: {
                customer_id: authUser,
                email:userSelect[0]?.email
            }
        };
  
        // Make API call to create a charge
        const response = await axios.post(`${apiUrl}/charges`, postData, {
            headers: {
                'Content-Type': 'application/json',
                'X-CC-Api-Key': apiKey,
                'X-CC-Version': '2018-03-22'
            }
        });
        const {code, id} = response?.data?.data
        await Qry('INSERT INTO `cryptopayments`(`userid`, `paymentcode`,`paymentid`, `createdat`,fiat_amount) VALUES (?,?,?,?,?)', [authUser,code,id,todayDate,amount])
        
        // Return charge information to the client
        res.json({status:"success",data:response.data});
        
      }
  
     }
   } catch (error) {
       console.log('Error creating charge:', error);
       res.status(500).json({status:"error",data:error?.message});
   }
   
   });

//  router.post("/sendpoints", async (req, res) => {
// const todayDate = await getCurrentTime();


//   await Qry(`update binarytree set left_points = 0, right_points = 0, total_left_points = 0, total_right_points = 0`)
//   await Qry(`delete from points`)
//   await Qry(`delete from pendingpoints`)

//   const selectTree = await Qry(`select * from binarytree where id >= 126`)
//   selectTree.map(async (udata)=>{
//     const SalePriceInUsd = udata?.investment
//     let tempPriceInUsd
//     if (SalePriceInUsd>500){
//       tempPriceInUsd =490
//       }
//       else{
//         tempPriceInUsd = SalePriceInUsd
//       }
//       console.log(udata.userid)


//       const selectBinaryPointsUsers = await Qry(`WITH RECURSIVE upline AS (
//         SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
//               COALESCE(parent.investment, 0) AS parent_investment
//         FROM binarytree bt
//         LEFT JOIN binarytree parent ON bt.pid = parent.userid
//         WHERE bt.userid = ?
//         UNION ALL
//         SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
//               COALESCE(parent.investment, 0) AS parent_investment
//         FROM binarytree bt
//         JOIN upline u ON bt.userid = u.pid
//         LEFT JOIN binarytree parent ON bt.pid = parent.userid
//       )
//       SELECT *
//       FROM upline;
//       `, [udata?.userid]);


//       const leftBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row.leg === 'L' && row.parent_investment >= tempPriceInUsd && row.pid !== null);
//       const rightBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row.leg === 'R' && row.parent_investment >= tempPriceInUsd && row.pid !== null);

//       const selectLeftBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row.leg === 'L' && row.parent_investment < tempPriceInUsd  && row.pid !== null);
//       const selectRightBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row.leg === 'R' && row.parent_investment < tempPriceInUsd  && row.pid !== null);

//       const leftApprovedReceiverIds = leftBinaryPointsUsers.map(row => row.pid);
//       const rightApprovedReceiverIds = rightBinaryPointsUsers.map(row => row.pid);

//       let leftApprovedDataToInsert = JSON.stringify({ receiver_ids: leftApprovedReceiverIds });
//       let rightApprovedDataToInsert = JSON.stringify({ receiver_ids: rightApprovedReceiverIds });

//       // console.log('leftApproved', leftApprovedDataToInsert)
//       // console.log('rightApproved', rightApprovedDataToInsert)

//       // console.log('Pendingleft', PendingLeftDataToInsert)
//       // console.log('Pendingright', PendingRightDataToInsert)
        
//       if (leftApprovedReceiverIds.length > 0) {
//         commaSeparatedLeftIds = leftApprovedReceiverIds.map(id => `'${id}'`).join(',');
//       //update left points
//       await Qry(`update binarytree set left_points = left_points + ?, total_left_points = total_left_points + ?, updatedat = ? where userid IN (${commaSeparatedLeftIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])

//       await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [udata?.userid, SalePriceInUsd, 'L', 'Binary Points', leftApprovedDataToInsert, todayDate]);
//       } 

//       if (rightApprovedReceiverIds.length > 0) {
//         commaSeparatedRightIds = rightApprovedReceiverIds.map(id => `'${id}'`).join(',');
//       //update right points
//       await Qry(`update binarytree set right_points = right_points + ?, total_right_points = total_right_points + ?, updatedat = ? where userid IN (${commaSeparatedRightIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])

//       await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [udata?.userid, SalePriceInUsd, 'R', 'Binary Points', rightApprovedDataToInsert, todayDate]);
//       } 


        
//       selectLeftBinaryPointsPendingUsers.map(async (uidata)=>{
//         await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[udata?.userid, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'L'])
//       })
      
//       selectRightBinaryPointsPendingUsers.map(async (uidata)=>{
//         await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[udata?.userid, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'R'])
//       })





//   });


//   res.json({
//     status:"success"
//   })


// });


router.post("/getChat", async (req, res) => {
const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const msgCode = CleanHTMLData(CleanDBData(req.body.msgCode));

      const GetChat = await Qry(`SELECT *  FROM messages where randomcode = ? and (sender = ? or receiver = ? or receiver = 'all') `,[msgCode,authUser,authUser]);;
      
    
      res.json({
        status: "success",
        data: GetChat,
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


//Get videos
router.post("/getvideos", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await checkAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const category = CleanHTMLData(CleanDBData(req.body.category));

    if (authUser) {
      const getNews = `SELECT * from videos where category = ? order by id desc`;
      const VideosData = await Qry(getNews,[category]);

      res.json({
        status: "success",
        data: VideosData,
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



//cron jobs


//check pending points
router.get("/pendingpoints", async (req, res) => {
const todayDate = await getCurrentTime();


  const selectPending = await Qry(`select p.*, bt.investment from pendingpoints p
  left join binarytree bt on bt.userid = p.receiverid
  where p.status = 'pending'`)

  selectPending.map(async (udata)=>{
      const parentId = udata?.receiverid
      const parentInvestment = udata?.investment
      const SalePriceInUsd = udata?.amount
      
      let tempPriceInUsd
      if (SalePriceInUsd>500){
        tempPriceInUsd =490
        }
        else{
          tempPriceInUsd = SalePriceInUsd
        }

        const leg = udata?.leg === 'L' ? 'left' : 'right'
        const dataToInsert = JSON.stringify({ receiver_ids: [parentId] });

        if(parentInvestment >= 490)
        {
          await Qry(`update binarytree set ${leg}_points = ${leg}_points + ?, total_${leg}_points = total_${leg}_points + ?, updatedat = ? where userid IN (${parentId})`, [SalePriceInUsd,SalePriceInUsd, todayDate])
  
          await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [udata?.receiverid, SalePriceInUsd, udata?.leg, 'Binary Points', dataToInsert, todayDate]);

          await Qry(`update pendingpoints set status = ? where id = ?`, ['approved', udata?.id])
    
        }
        else if(parentInvestment >= 240 && SalePriceInUsd <= 260)
        {
  
          await Qry(`update binarytree set ${leg}_points = ${leg}_points + ?, total_${leg}_points = total_${leg}_points + ?, updatedat = ? where userid IN (${parentId})`, [SalePriceInUsd,SalePriceInUsd, todayDate])
  
          await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [udata?.receiverid, SalePriceInUsd, udata?.leg, 'Binary Points', dataToInsert, todayDate]);
        
          await Qry(`update pendingpoints set status = ? where id = ?`, ['approved', udata?.id])

        }
  })

  res.json({
    status:"success"
  })


});


//binary bonus cronjob
//binary bonus cronjob
router.get("/binarybonus", async (req, res) => {
const todayDate = await getCurrentTime();


  const selectBonusUser = await Qry(`select bt.* from binarytree bt where left_points >= 490 and right_points >= 490`)

  selectBonusUser.map(async (btdata)=>{
    
    if((btdata?.investment >= 990 && btdata?.left_points >= 490 && btdata?.right_points >= 490) || btdata?.investment < 990)
    {

      let convertedPoints = btdata?.left_points > btdata?.right_points  ? btdata?.right_points  : btdata?.left_points
      let bonusAmount = convertedPoints * 0.1;
      const userId = btdata?.userid
      const binaryActiveData = await Qry(`
      SELECT 
      MAX(CASE WHEN referral_side = 'L' THEN 1 ELSE 0 END) AS has_L,
      MAX(CASE WHEN referral_side = 'R' THEN 1 ELSE 0 END) AS has_R,
      CASE
          WHEN MAX(CASE WHEN referral_side = 'L' THEN 1 ELSE 0 END) = 1 AND
               MAX(CASE WHEN referral_side = 'R' THEN 1 ELSE 0 END) = 1 THEN 1
          ELSE 0
      END AS binary_active
  FROM 
      usersdata
  WHERE sponsorid = ?
      `, [userId])

      const userInvestment = btdata?.investment * 5
      let tempAmount
      
      if(userInvestment < bonusAmount)
      {
        tempAmount = bonusAmount-userInvestment
        tempAmount = tempAmount/0.1
        convertedPoints = convertedPoints-tempAmount
        bonusAmount = convertedPoints * 0.1
        
      await Qry("update usersdata set upgradeeligible =  ? where id = ?", ['yes', userId])

      }
      
if(binaryActiveData[0]?.binary_active == 1)
{
  await Qry(`update binarytree set left_points =  left_points - ?, right_points = right_points - ?, converted_points = converted_points + ? where userid = ?`, [convertedPoints,convertedPoints,convertedPoints, userId])

  await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [bonusAmount, userId])

  await Qry("insert into transaction ( receiverid, senderid, amount, type, details, createdat) values ( ? , ? , ? ,? , ?, ?)", [userId,0 , bonusAmount, 'matchingbonus', 'matching bonus', todayDate])
  
}else{

  await Qry("insert into transaction ( receiverid, senderid, amount, type, details, createdat,status) values ( ? , ? , ? ,? , ?, ?,?)", [userId,0 , bonusAmount, 'matchingbonus', 'not a binary active user', todayDate,'expired'])

}



    }

  })



  res.json({
    status:"success"
  })


});

//approve unilevel bonus
router.get("/approveunilevelbonus", async (req, res) => {
  const todayDate = await getCurrentTime();
  const dateParts = todayDate.split(' ');
  const dateOnly = dateParts[0];

  const selectPending = await Qry(`select t.id,t.receiverid,t.amount, ud.sponsorid, ud.username from transaction t
  left join usersdata ud on ud.id = t.receiverid
    where t.type = ? and date(t.createdat) = ?`, ['matchingbonus', dateOnly]);

  const settingsData = await Qry("SELECT * FROM `setting` WHERE keyname IN (?, ?, ?, ?, ?, ?, ?, ?, ?)", ['referral_commission_status', 'referral_commission_type', 'referral_commission_value', 'unilevel_status', 'unilevel_bonus_level1', 'unilevel_bonus_level2', 'unilevel_bonus_level3', 'unilevel_bonus_level4', 'unilevel_bonus_level5']);

  const uniLevelStatus = settingsData[3]?.keyvalue;

  for (const tdata of selectPending) {
      let sponsorid = tdata.sponsorid;
      let username = tdata.username;

      // console.log(tdata?.receiverid)
      for (let x = 4; x <= 8 && sponsorid !== null && sponsorid !== undefined; x++) {

          let level = x - 3;
          let bonusValue, bonusType, bonusDetails;

          if (uniLevelStatus === 'On' && sponsorid !== null && sponsorid !== undefined) {
              bonusType = "unilevelbonus";
              bonusDetails = `Received Level ${level} commission from user ${username}`;
              const bonusPercentage = settingsData[x]?.keyvalue;
              bonusValue = (bonusPercentage / 100) * tdata.amount;

              const checkMatchingBonus = await Qry(`SELECT * FROM transaction WHERE type = ? and date(createdat) = ? and receiverid = ? and amount >= ?`, ['matchingbonus',dateOnly, sponsorid, 500]);


              if (bonusValue > 0 && checkMatchingBonus?.length > 0) {
                  // console.log(`user ${sidData[0]?.username} will get level ${level} bonus ${bonusValue} of amount ${tdata.amount} from user ${username} investment of ${sidData[0]?.username} is ${sidData[0]?.investment} and get binary bonus this week is ${checkMatchingBonus[0]?.amount}`);

                  updateSponsorBalance = await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [bonusValue, sponsorid])
                  insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details,status, createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [sponsorid, tdata?.receiverid, bonusValue, 'unilevelbonus', `Received Level ${level} commission from user ${username}`, 'approved', todayDate])
              } else {
                //console.log(`level ${level} cancelled for user ${sidData1[0]?.username} id => ${sidData1[0]?.id}`)

                  insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details,status, createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [sponsorid, tdata?.receiverid, bonusValue, 'unilevelbonus', `Received Level ${level} commission from user ${username}`, 'expired', todayDate])
              }
          }
          
          const sidData = await Qry('SELECT * FROM usersdata WHERE id = ?', [sponsorid]);
          sponsorid = sidData[0]?.sponsorid;

      }
  }

  res.json({
      status: "success"
  });
});
//ipn

//check pending nft transactions
router.get("/approve-pending-nft-transactions", async (req, res) => {
  const todayDate = await getCurrentTime();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const timestamp = Math.round(twentyFourHoursAgo.getTime() / 1000);
  const settingSelectResult = await Qry(`select * from setting where keyname = 'maticprice'`);
  const tokenUsdPrice = settingSelectResult[0]?.keyvalue
  console.log(tokenUsdPrice)

  sdk.list_events_by_collection({
    after: timestamp,
    event_type: 'sale',
    collection_slug: 'savage-dogs-omega-jr'
  })
  .then(async ({ data }) => {
    await data?.asset_events.map(async (nftData)=>{
      const eventType = nftData?.event_type
      if(eventType === "sale")
      {

        const tokenSymbol = nftData?.payment?.symbol
        const tokenDecimals = nftData?.payment?.decimals
        const receiverAddress = nftData?.buyer
        const  transactionId = nftData?.transaction
        const  SalePriceInTokenSmallestUnit = nftData?.payment?.quantity
        const itemChain = nftData?.chain
        const itemName = nftData?.nft?.name
        const itemImageUrl = nftData?.nft?.image_url
        const permaLink = nftData?.nft?.opensea_url
        const nftId = nftData?.nft?.contract
        const SalePriceInToken = await weiToEther(SalePriceInTokenSmallestUnit, tokenDecimals)
        const SalePriceInUsd = Math.round(SalePriceInToken*tokenUsdPrice)

        const selectTransaction = await Qry(`select * from usernfts where transactionid = ?`, [transactionId])
        if(selectTransaction.length < 1)
        {

          if (SalePriceInUsd>500){
            tempPriceInUsd =490
            }
            else{
              tempPriceInUsd = SalePriceInUsd
            }
            const userNft = await Qry(`SELECT * FROM usernfts WHERE transactionid = ?`, [transactionId]);
            if(userNft.length < 1)
            {
        
            const userSelect = await Qry(`SELECT * FROM usersdata WHERE walletaddress = ?`, [receiverAddress]);
            if(userSelect.length > 0 && userSelect[0]?.status === "pending")
            {
          
              
          const userdbData = userSelect[0];
          const authUser = userdbData?.id
          const username =  userdbData?.username
          let sponsorid = userdbData?.sponsorid
          let pid = userdbData?.pid || 2
          const userStatus = userdbData?.status
        
        
          const selectPkg = await Qry(`select * from packages where amount >= ? and ? >= 250 and ? <= 25500 order by id asc limit 1`,[SalePriceInUsd, SalePriceInUsd,SalePriceInUsd])
        
            if(selectPkg.length > 0)
            {
              const pkgId = selectPkg[0]?.id
              if(sponsorid !== undefined || sponsorid !== null || sponsorid !== "")
              {
        
                if(userStatus === 'pending')
                {
                  const placementUser = await findAvailableSpace(pid,userdbData?.referral_side)
                  const insertTree = await Qry(`insert into binarytree(userid,pid,leg,status,createdat) values (?,?,?,?,?)`,[authUser, placementUser,userdbData?.referral_side,'active',todayDate])
                }
              }
        
              await Qry("update usersdata set investment = investment + ?, pkgid = ?, status = ? where id = ?", [SalePriceInUsd,pkgId, 'approved', authUser])
              await Qry("update binarytree set investment = investment + ?, updatedat = ? where userid = ?", [SalePriceInUsd,todayDate, authUser])
        
              await Qry("insert into transaction ( receiverid, senderid, amount, type, details,createdat) values ( ? , ? , ? ,? , ?, ?)", [0, authUser, SalePriceInUsd, 'investment', 'investment', todayDate])
        
              //package history
              await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [authUser, pkgId, transactionId, SalePriceInUsd, 'approved', 'package', todayDate])
        
              await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, walletaddress, title,type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, authUser, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,receiverAddress,itemName,'recheck' ])
        
        
              const selectBinaryPointsUsers = await Qry(`WITH RECURSIVE upline AS (
                SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
                       COALESCE(parent.investment, 0) AS parent_investment
                FROM binarytree bt
                LEFT JOIN binarytree parent ON bt.pid = parent.userid
                WHERE bt.userid = ?
                UNION ALL
                SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
                       COALESCE(parent.investment, 0) AS parent_investment
                FROM binarytree bt
                JOIN upline u ON bt.userid = u.pid
                LEFT JOIN binarytree parent ON bt.pid = parent.userid
              )
              SELECT *
              FROM upline;
              `, [authUser]);
        
        
              const leftBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'L' && row?.parent_investment >= tempPriceInUsd && row?.pid !== null);
              const rightBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'R' && row?.parent_investment >= tempPriceInUsd && row?.pid !== null);
        
              const selectLeftBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'L' && row?.parent_investment < tempPriceInUsd  && row?.pid !== null);
              const selectRightBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row.leg === 'R' && row.parent_investment < tempPriceInUsd  && row?.pid !== null);
        
              const leftApprovedReceiverIds = leftBinaryPointsUsers.map(row => row?.pid);
              const rightApprovedReceiverIds = rightBinaryPointsUsers.map(row => row?.pid);
        
              let leftApprovedDataToInsert = JSON.stringify({ receiver_ids: leftApprovedReceiverIds });
              let rightApprovedDataToInsert = JSON.stringify({ receiver_ids: rightApprovedReceiverIds });
        
              // console.log('leftApproved', leftApprovedDataToInsert)
              // console.log('rightApproved', rightApprovedDataToInsert)
        
              // console.log('Pendingleft', PendingLeftDataToInsert)
              // console.log('Pendingright', PendingRightDataToInsert)
                
              if (leftApprovedReceiverIds.length > 0) {
                commaSeparatedLeftIds = leftApprovedReceiverIds.map(id => `'${id}'`).join(',');
              //update left points
              await Qry(`update binarytree set left_points = left_points + ?, total_left_points = total_left_points + ?, updatedat = ? where userid IN (${commaSeparatedLeftIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])
        
              await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'L', 'Binary Points', leftApprovedDataToInsert, todayDate]);
              } 
        
              if (rightApprovedReceiverIds.length > 0) {
                commaSeparatedRightIds = rightApprovedReceiverIds.map(id => `'${id}'`).join(',');
              //update right points
              await Qry(`update binarytree set right_points = right_points + ?, total_right_points = total_right_points + ?, updatedat = ? where userid IN (${commaSeparatedRightIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])
        
              await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'R', 'Binary Points', rightApprovedDataToInsert, todayDate]);
              } 
        
        
                
              selectLeftBinaryPointsPendingUsers.map(async (uidata)=>{
                await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'L'])
              })
              
              selectRightBinaryPointsPendingUsers.map(async (uidata)=>{
                await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'R'])
              })
        
         
        
              const settingsData = await Qry("SELECT * FROM `setting` WHERE keyname IN (?, ?, ?, ?, ?, ?, ?, ?, ?)", ['referral_commission_status', 'referral_commission_type', 'referral_commission_value', 'unilevel_status', 'unilevel_bonus_level1', 'unilevel_bonus_level2', 'unilevel_bonus_level3', 'unilevel_bonus_level4', 'unilevel_bonus_level5']);
        
              const referralCommissionType = settingsData[0]?.keyvalue
              const referralCommissionValue = settingsData[1]?.keyvalue
              const referralCommissionStatus = settingsData[2]?.keyvalue
              const uniLevelStatus = settingsData[3]?.keyvalue
              let commissionAmount
        
              if (referralCommissionStatus === 'On') {
                referralCommissionType === 'Percentage' ?
                  commissionAmount = (referralCommissionValue / 100) * SalePriceInUsd
                  : referralCommissionType === 'Flat' ?
                    commissionAmount = referralCommissionValue
                    :
                    commissionAmount = 0
                if (commissionAmount > 0) {
                  updateSponsorBalance = await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [commissionAmount, sponsorid])
        
                  insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details, createdat) values ( ? , ? , ? ,? , ?, ?)", [sponsorid, authUser, commissionAmount, 'referralbonus', referralCommissionType, todayDate])
                }
              }
        

        
            }
            else{
        
              await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, `details`, walletaddress, title,type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, authUser, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,'package not found',receiverAddress,itemName,'recheck' ])
        
              await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [authUser, null, transactionId, SalePriceInUsd, 'pending', 'package', todayDate])
        
            }
          }
          else{
        
            await Qry("INSERT INTO `usernfts`(`nftid`, `transactionid`, `userid`, `permalink`, `imageurl`, `chain`, `token`, `tokenprice`, `usdprice`, `createdat`, `details`,walletaddress, title,type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [nftId, transactionId, null, permaLink, itemImageUrl,itemChain, tokenSymbol, SalePriceInToken,SalePriceInUsd,todayDate,'no user found with this address or already have the 1 nft limit',receiverAddress,itemName,'recheck' ])
          
            await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [null, null, transactionId, SalePriceInUsd, 'pending', 'package', todayDate])
          
          }
        }
        
        }else{
          console.log('already', transactionId)

        }

      }

    })
    res.status(200).json({
      status:"success",
      
    })
  })
  .catch(err => {
    console.log(err)
    res.json({
      status:"error",
      message:err
    })
  });


});

//coinbase ipn


router.post("/paybycryptoipn", async (req, res) => {
  const todayDate = await getCurrentTime();
  
  const postData = req.body;
  const insertDummyQry = `insert into dummy(d_data,web) values (?,?)`;
  await Qry(insertDummyQry, [JSON.stringify(postData), 'coinbase']);

  const eventType = postData?.event?.type
  const paymentCode = postData?.event?.data?.code
  const paymentId = postData?.event?.data?.id
  const [action, status] = eventType.split(':');
  const selectTransaction = await Qry(`select * from cryptopayments where paymentcode = ? and paymentid = ?`,[paymentCode, paymentId])

  if(selectTransaction.length > 0 && selectTransaction[0]?.paymentstatus !== "confirmed")
  {
    if(action === "charge" && status === "confirmed")
    {
      const authUser = selectTransaction[0]?.userid
      const userData = await Qry(`select * from usersdata where id = ?`,[authUser])
      const userdbData = userData[0];
      const username =  userdbData?.username
      let sponsorid = userdbData?.sponsorid
      let pid = userdbData?.pid || 2
      const userStatus = userdbData?.status

      const SalePriceInUsd = postData?.event?.data?.payments[0]?.value?.local?.amount
      const totalPackageAmount = +SalePriceInUsd + +userdbData?.investment
      const tempPriceInUsd = totalPackageAmount
      const SalePriceInToken = postData?.event?.data?.payments[0]?.value?.crypto?.amount
      const itemChain = postData?.event?.data?.payments[0]?.network
      const  transactionId = postData?.event?.data?.payments[0]?.transaction_id
      const  payerAddress = postData?.event?.data?.payments[0]?.payer_addresses[0]

      await Qry(`update cryptopayments set paymentstatus = ?, updatedat = ?, transactionid = ?, payeraddress = ?, network = ?, fiat_amount = ?, crypto_amount = ?  where id = ?`,[status,todayDate,transactionId,payerAddress,itemChain,SalePriceInUsd,SalePriceInToken, selectTransaction[0]?.id])

      const selectPkg = await Qry(`select * from packages where amount >= ? and ? >= 250 and ? <= 25500 order by id asc limit 1`,[totalPackageAmount, totalPackageAmount,totalPackageAmount])

      if(selectPkg.length > 0)
      {
        const pkgId = selectPkg[0]?.id
        
        await Qry("update usersdata set investment = investment + ?, pkgid = ?, status = ?, upgradeeligible = ? where id = ?", [SalePriceInUsd,pkgId, 'approved', 'no',authUser])

        await Qry("update binarytree set investment = investment + ?, updatedat = ? where userid = ?", [SalePriceInUsd,todayDate, authUser])
  
        await Qry("insert into transaction ( receiverid, senderid, amount, type, details,createdat) values ( ? , ? , ? ,? , ?, ?)", [0, authUser, SalePriceInUsd, 'investment', 'package upgrade', todayDate])

        //package history
        await Qry("insert into userpackages (userid , packageid , orderid, amount, status, type,createdat,buyingtype) values ( ? , ? , ? ,? , ?, ?, ?,?)", [authUser, pkgId, transactionId, SalePriceInUsd, 'approved', 'package', todayDate,'upgrade'])
        
  
  
        const selectBinaryPointsUsers = await Qry(`WITH RECURSIVE upline AS (
          SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
                 COALESCE(parent.investment, 0) AS parent_investment
          FROM binarytree bt
          LEFT JOIN binarytree parent ON bt.pid = parent.userid
          WHERE bt.userid = ?
          UNION ALL
          SELECT bt.id, bt.userid, bt.pid, bt.leg, bt.investment,
                 COALESCE(parent.investment, 0) AS parent_investment
          FROM binarytree bt
          JOIN upline u ON bt.userid = u.pid
          LEFT JOIN binarytree parent ON bt.pid = parent.userid
        )
        SELECT *
        FROM upline;
        `, [authUser]);
  
  
        const leftBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'L' && row?.parent_investment >= tempPriceInUsd && row?.pid !== null);
        const rightBinaryPointsUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'R' && row?.parent_investment >= tempPriceInUsd && row?.pid !== null);
  
        const selectLeftBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row?.leg === 'L' && row?.parent_investment < tempPriceInUsd  && row?.pid !== null);
        const selectRightBinaryPointsPendingUsers = selectBinaryPointsUsers.filter(row => row.leg === 'R' && row.parent_investment < tempPriceInUsd  && row?.pid !== null);
  
        const leftApprovedReceiverIds = leftBinaryPointsUsers.map(row => row?.pid);
        const rightApprovedReceiverIds = rightBinaryPointsUsers.map(row => row?.pid);
  
        let leftApprovedDataToInsert = JSON.stringify({ receiver_ids: leftApprovedReceiverIds });
        let rightApprovedDataToInsert = JSON.stringify({ receiver_ids: rightApprovedReceiverIds });
  
        // console.log('leftApproved', leftApprovedDataToInsert)
        // console.log('rightApproved', rightApprovedDataToInsert)
  
        // console.log('Pendingleft', PendingLeftDataToInsert)
        // console.log('Pendingright', PendingRightDataToInsert)
          
        if (leftApprovedReceiverIds.length > 0) {
          commaSeparatedLeftIds = leftApprovedReceiverIds.map(id => `'${id}'`).join(',');
        //update left points
        await Qry(`update binarytree set left_points = left_points + ?, total_left_points = total_left_points + ?, updatedat = ? where userid IN (${commaSeparatedLeftIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])
  
        await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'L', 'Binary Points', leftApprovedDataToInsert, todayDate]);
        } 
  
        if (rightApprovedReceiverIds.length > 0) {
          commaSeparatedRightIds = rightApprovedReceiverIds.map(id => `'${id}'`).join(',');
        //update right points
        await Qry(`update binarytree set right_points = right_points + ?, total_right_points = total_right_points + ?, updatedat = ? where userid IN (${commaSeparatedRightIds})`, [SalePriceInUsd,SalePriceInUsd, todayDate])
  
        await Qry("insert into points(sender_id,points,leg,type,receiver_ids,dat) values (?, ?, ?, ?, ?, ?)", [authUser, SalePriceInUsd, 'R', 'Binary Points', rightApprovedDataToInsert, todayDate]);
        } 
  
  
          
        selectLeftBinaryPointsPendingUsers.map(async (uidata)=>{
          await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'L'])
        })
        
        selectRightBinaryPointsPendingUsers.map(async (uidata)=>{
          await Qry("INSERT INTO `pendingpoints`(`senderid`, `receiverid`, `amount`, `createdat`, `updatedat`, `status`, leg) VALUES (?,?,?,?,?,?,?)",[authUser, uidata?.pid, SalePriceInUsd, todayDate, null, 'pending', 'R'])
        })
  
   
  
        const settingsData = await Qry("SELECT * FROM `setting` WHERE keyname IN (?, ?, ?, ?, ?, ?, ?, ?, ?)", ['referral_commission_status', 'referral_commission_type', 'referral_commission_value', 'unilevel_status', 'unilevel_bonus_level1', 'unilevel_bonus_level2', 'unilevel_bonus_level3', 'unilevel_bonus_level4', 'unilevel_bonus_level5']);
  
        const referralCommissionType = settingsData[0]?.keyvalue
        const referralCommissionValue = settingsData[1]?.keyvalue
        const referralCommissionStatus = settingsData[2]?.keyvalue
        const uniLevelStatus = settingsData[3]?.keyvalue
        let commissionAmount
  
        if (referralCommissionStatus === 'On') {
          referralCommissionType === 'Percentage' ?
            commissionAmount = (referralCommissionValue / 100) * SalePriceInUsd
            : referralCommissionType === 'Flat' ?
              commissionAmount = referralCommissionValue
              :
              commissionAmount = 0
          if (commissionAmount > 0) {
            updateSponsorBalance = await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [commissionAmount, sponsorid])
  
            insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details, createdat) values ( ? , ? , ? ,? , ?, ?)", [sponsorid, authUser, commissionAmount, 'referralbonus', referralCommissionType, todayDate])
          }
        }
  
  
        let bonusValue, bonusType, bonusDetails;
        let x = 4;
        let level = 1
        let totalInvestment
        if (uniLevelStatus === 'On') {
       
          while (x <= 8 && sponsorid !== null && sponsorid !== undefined) {
            const sidData = await Qry(
              'SELECT * FROM usersdata WHERE id = ?',
              [sponsorid]
            );
            sponsorid = sidData[0]?.sponsorid;
            const sidData1 = await Qry(
              'SELECT * FROM usersdata WHERE id = ?',
              [sponsorid]
            );
            totalInvestment = sidData1[0]?.investment 
  
     
            bonusType = "unilevelbonus";
            bonusDetails = `Received Level ${level} commission from user ${username}`;
            
            const bonusPercentage = settingsData[x]?.keyvalue;
            bonusValue = (bonusPercentage / 100) * SalePriceInUsd;
            if(bonusValue > 0 && totalInvestment >= 490 && (sponsorid !== null && sponsorid !== undefined))
            {
               updateSponsorBalance = await Qry("update usersdata set current_balance = current_balance + ? where id = ?", [bonusValue, sponsorid])
  
              insertTransaction = await Qry("insert into transaction ( receiverid, senderid, amount, type, details,status, createdat) values ( ? , ? , ? ,? , ?, ?, ?)", [sponsorid, authUser, bonusValue, 'unilevelbonus', `Received Level ${level} commission from user ${username}`, 'pending', todayDate])
            }
           
  
  
            x++
            level++
          }
        }
      }
      else{
        await Qry(`update cryptopayments set paymentstatus = ?, updatedat = ?, details = ? where id = ?`,[status,todayDate, 'no package found for this amount', selectTransaction[0]?.id])

      }
    }else{
      await Qry(`update cryptopayments set paymentstatus = ?, updatedat = ? where id = ?`,[status,todayDate, selectTransaction[0]?.id])
    }



  }
  
    res.json({
      status:"success"
    })
  
  
  });
  

module.exports = router;

