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

router.post("/login", async (req, res) => {

  const postData = req.body;
  const username = CleanHTMLData(CleanDBData(postData.username));
  const password = CleanHTMLData(CleanDBData(postData.password));

  try {
    const selectUserQuery = `SELECT * FROM usersdata WHERE username = ?`;
    const selectUserResult = await Qry(selectUserQuery, [username]);

    if (selectUserResult.length === 0) {
      res.json({
        status: "error",
        message: "Invalid login details.",
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
        message: "Invalid login details.",
      });
      return;
    } else if (user.emailstatus === "unverified") {
      res.json({
        status: "error",
        message: "Please verify your account first. We have sent you an email.",
      });
      return;
    } else if (
      user.username === username &&
      passwordMatch &&
      user.usertype === "admin"
    ) {
      console.log("user.usertypeuser.usertypeuser.usertype", user.usertype);
      const token = jwt.sign({ username }, secretKey, { expiresIn: "12h" });
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");
      const expireat = new Date(date);
      expireat.setHours(expireat.getHours() + 1);

      //   const insertQuery = `INSERT INTO access_tokens (username, token, created_at, expire_at) VALUES (?, ?, ?, ?)`;
      //   const insertParams = [username, token, date, expireat];
      //   const insertResult = await Qry(insertQuery, insertParams);

      const updateLoginQuery = `UPDATE usersdata SET lastlogin = ?, lastip = ? WHERE username = ?`;
      const updateLoginParams = [date, req.ip, username];
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
    } else {
      res.json({
        status: "error",
        message: "you are not allowed to login as admin",
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

//login admin data
router.post("/userdata", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token

    if (authUser) {
      const userSelectQuery = `SELECT sponsorid, username, randomcode, firstname, lastname, email, picture, current_balance,  status, mobile, emailstatus, address, country, createdat, loginstatus, lastlogin, lastip, allowedroutes FROM usersdata WHERE id = ?`;

      const userSelectParams = [authUser];
      const userSelectResult = await Qry(userSelectQuery, userSelectParams);
      const userdbData = userSelectResult[0];

      const transactionSelectQuery = `SELECT COALESCE(SUM(amount), 0) AS totalpayout FROM transaction WHERE type = 'payout' AND receiverid = ?`;
      const transactionSelectParams = [authUser];
      const transactionSelectResult = await Qry(
        transactionSelectQuery,
        transactionSelectParams
      );
      const transactiondbData = transactionSelectResult[0];
      userdbData.totalpayout = transactiondbData.totalpayout;

      const selectTreeQuery = `SELECT COUNT(*) AS count FROM usersdata WHERE sponsorid = ? AND status = 'approved'`;
      const selectTreeParams = [authUser];
      const selectTreeResult = await Qry(selectTreeQuery, selectTreeParams);
      const count = selectTreeResult[0].count;
      userdbData.activereferrals = count;

      userdbData.referrallink = `${weblink}signup/${userdbData.randomcode}`;

      userdbData.profilepictureurl = `${backoffice_link}uploads/userprofile/${userdbData.picture}`;

      res.json({
        status: "success",
        data: userdbData,
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
    console.error("Error executing query:", error);
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
    console.error("Error executing query:", error);
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
    console.error("Error executing query:", error);
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
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


router.post("/dashboardData", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const GetTotalUsers = `SELECT COUNT(*) as total FROM usersdata WHERE usertype = ? and id <> 0`;
      const TotalUsers = await Qry(GetTotalUsers, ['user']);

      const GetActiveUsers = `SELECT COUNT(*) as total FROM usersdata WHERE status = ? and id <> 0`;
      const TotalActiveUsers = await Qry(GetActiveUsers, ['approved']);

      const GetInActiveUsers = `SELECT COUNT(*) as total FROM usersdata WHERE status = ? and id <> 0`;
      const TotalInActiveUsers = await Qry(GetInActiveUsers, ['pending']);




      const selectTransactionsCurrentMonthQuery = `SELECT SUM(amount2) as total FROM transaction WHERE type = ? and status = ? and MONTH(approvedat) = MONTH(now()) and YEAR(approvedat) = YEAR(now())`;
      const selectCurrentMonthPayoutResult = await Qry(
        selectTransactionsCurrentMonthQuery,
        ["payout", "approved"]
      );

      const selectAllTimeQuery = `SELECT SUM(amount2) as total FROM transaction WHERE type = ? and status = ?`;
      const selectAllTimePayoutResult = await Qry(selectAllTimeQuery, [
        "payout", "approved"
      ]);

      const GetPendingPayout = `SELECT COUNT(*) as total FROM transaction WHERE type = ? and status = ?`;
      const TotalPendingPayout = await Qry(GetPendingPayout, ['payout', 'pending']);


      let data = {
        total_users: TotalUsers[0].total,
        active_users: TotalActiveUsers[0].total,
        inactive_users: TotalInActiveUsers[0].total,
        currentMonth_payout: selectCurrentMonthPayoutResult[0].total,
        allTime_payout: selectAllTimePayoutResult[0].total,
        pending_payout: TotalPendingPayout[0].total,
      }

      res.json({
        status: "success",
        data: data,
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

//Add News
router.post("/addnews", upload.single("image"),async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;

    if (authUser) {

      const uploadDir = path.join(__dirname, "../public/uploads/news/");
      const imageParts = postData.image.split(";base64,");
      const imageTypeAux = imageParts[0].split("image/");
      const imageType = imageTypeAux[1];
      const imageBase64 = Buffer.from(imageParts[1], "base64");
      const filename = `${Date.now()}.png`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, imageBase64);

      const title = CleanHTMLData(CleanDBData(postData.title));
      const description = CleanHTMLData(CleanDBData(postData.description));

      const insertQuery = "INSERT into news (title,description,image) values (?,?,?)";
      const updateParams = [title, description,filename];
      const updateResult = await Qry(insertQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "News addedd successfully!",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to insert news",
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


//Get News
router.post("/getnews", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const getNews = `SELECT * from news`;
      const NewsData = await Qry(getNews);

      res.json({
        status: "success",
        data: NewsData,
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

//Delete News
router.post("/deletenews", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token

    if (authUser) {
      const postData = req.body;
      const id = CleanHTMLData(CleanDBData(postData.id));

      const deleteQuery = "DELETE from news WHERE id = ?";
      const deleteParams = [id];
      const deleteResult = await Qry(deleteQuery, deleteParams);

      if (deleteResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "News deleted successfully!",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to delete news",
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


//Add Video
router.post("/addvideo", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;

    if (authUser) {
      const category = CleanHTMLData(CleanDBData(postData.category));
      const name = CleanHTMLData(CleanDBData(postData.name));
      const url = CleanHTMLData(CleanDBData(postData.url));
      console.log("url",url)
      const insertQuery = "INSERT into videos (category,name,url) values (?,?,?)";
      const updateParams = [category,name, url];
      const updateResult = await Qry(insertQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Video addedd successfully!",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to insert news",
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


//Get videos
router.post("/getvideos", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const getNews = `SELECT * from videos`;
      const VideosData = await Qry(getNews);

      res.json({
        status: "success",
        data: VideosData,
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

//Delete video
router.post("/deletevideo", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token

    if (authUser) {
      const postData = req.body;
      const id = CleanHTMLData(CleanDBData(postData.id));

      const deleteQuery = "DELETE from videos WHERE id = ?";
      const deleteParams = [id];
      const deleteResult = await Qry(deleteQuery, deleteParams);

      if (deleteResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Video deleted successfully!",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to delete news",
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

//Delete User
router.post("/deleteuser", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token

    if (authUser) {
      const postData = req.body;
      const userid = CleanHTMLData(CleanDBData(postData.userid));

      const deleteQuery = "DELETE from usersdata WHERE id = ?";
      const deleteResult = await Qry(deleteQuery, [userid]);

      if (deleteResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "User deleted successfully!",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to delete user",
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

//Update User Current Balance
router.post("/updatecurrentbalance/", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;

    if (authUser) {
      const userid = CleanHTMLData(CleanDBData(postData.userid.userid));
      const type = CleanHTMLData(CleanDBData(postData.type));
      const amount = CleanHTMLData(CleanDBData(postData.amount));
      const notes = CleanHTMLData(CleanDBData(postData.notes));
      let transactioType  = ""
      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [userid]);
      const userData = selectUserResult[0];
      let balance = selectUserResult[0]["current_balance"];

      if (selectUserResult.length === 0) {
        res.json({
          status: "error",
          message: "No account found with this username",
        });
        return;
      }

      let details = "";
      if (type === "Deduct") {
        transactioType = "adminbalancededucted"
        balance = balance - amount;
        details =
          `An amount of $${amount} debited from ewallet balance by admin (Notes:${notes})`;
      } else if (type === "Add") {
        transactioType = "adminbalanceadded"
        balance = +balance + +amount;
        details =
          `An amount of  $${amount} credited to ewallet balance by admin (Notes:${notes})`;
      }

      const updateQuery =
        "UPDATE usersdata SET current_balance = ? WHERE id = ?";
      const updateParams = [balance, userid];
      const updateResult = await Qry(updateQuery, updateParams);

      const insertQuery =
        "insert into transaction ( receiverid, senderid, amount, type, details) values ( ? , ? , ? ,? , ?)";
      const insertParams = [userid, 0, amount, transactioType, details];
      const insertResult = await Qry(insertQuery, insertParams);

      if (insertResult.affectedRows > 0 && updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: details,
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to update balance",
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

//Get Users List
router.post("/getuserslist", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      let statuscondition = "";
      if (req.body.status !== undefined && req.body.status !== null) {
        statuscondition = `AND status = '${req.body.status}'`;
      }
      const getUsers = `SELECT emailstatus,
      ud.id as userid, ud.username,ud.randomcode, ud.firstname, ud.lastname,ud.current_balance as walletbalance, ud.email, ud.createdat, ud.mobile, ud.loginstatus, ud.country, ud.membership, ud.stockist, ud.address, ud.city, ud.storename
      FROM usersdata ud
      where usertype = ? ${statuscondition}
      ORDER BY ud.id DESC
      `;
      const UsersData = await Qry(getUsers, ["user"]);

      res.json({
        status: "success",
        userdata: UsersData,
      });
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: error.message,
    });
  }
});
//update profile data
router.post("/updateprofiledata", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const updates = [];
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");
      postData.updatedat = date;

      for (const [key, value] of Object.entries(postData)) {
        const sanitizedValue = CleanHTMLData(CleanDBData(value));
        updates.push(`${key} = '${sanitizedValue}'`);
      }

      const updateQuery = `UPDATE usersdata SET ${updates.join(
        ", "
      )} WHERE id = '${authUser}'`;
      const updateResult = await Qry(updateQuery);

      if (updateResult) {
        res.status(200).json({
          status: "success",
          message: "Profile Data updated successfully",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Something went wrong. Please try again later.",
        });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

//update profile picture
router.post(
  "/updateprofilepicture/",
  upload.single("image"),
  async (req, res) => {
    const todayDate = await getCurrentTime();

    const postData = req.body;
    try {
      const authUser = await adminAuthorization(req, res);
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

          const updateQuery = `UPDATE usersdata SET picture = '${filename}', updatedat = '${date}'  WHERE id = '${authUser}'`;
          const updateResult = await Qry(updateQuery);

          if (updateResult) {
            const pictureUrl = `${req.protocol}://${req.get(
              "host"
            )}/uploads/userprofile/${filename}`;
            res.status(200).json({
              status: "success",
              message: "Profile picture updated successfully",
              pictureurl: pictureUrl,
            });
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
  }
);

// za Update featured status of a product

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


//update profile password
router.post("/updatepassword/", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;
    const oldpassword = CleanHTMLData(CleanDBData(postData.oldpassword));
    const newpassword = CleanHTMLData(CleanDBData(postData.newpassword));

    if (authUser) {
      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [authUser]);

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
        selectUserResult[0].password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(oldpassword, decryptedPassword);

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Incorrect Old Password",
        });
        return;
      }

      const updateQuery = "UPDATE usersdata SET password = ? WHERE id = ?";
      const updateParams = [encryptedPassword, authUser];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Password has been updated successfully",
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

//get settings data
router.post("/getsettingsdata", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const keynames = postData.keynames;
  try {
    const authUser = adminAuthorization(req, res);
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
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//update settings data
router.post("/updatesettingsdata", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = adminAuthorization(req, res);
    if (authUser) {
      for (const [keyname, value] of Object.entries(postData.obj)) {
        const updateQuery = `UPDATE setting SET keyvalue = ? WHERE keyname = ?`;
        const updateParams = [value, keyname];
        await Qry(updateQuery, updateParams);
      }

      res.json({
        status: "success",
        message: "settings data is updated successfully",
      });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: e });
  }
});

//update user password
router.post("/updateuserpassword/", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    const password = CleanHTMLData(CleanDBData(postData.password));
    const confirmassword = CleanHTMLData(CleanDBData(postData.confirmpassword));
    const admintransactionpassword = CleanHTMLData(
      CleanDBData(postData.admintransactionpassword)
    );

    if (authUser) {
      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [authUser]);

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
      const decryptedPassword = crypto.AES.decrypt(
        selectUserResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admintransactionpassword,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      if (password !== confirmassword) {
        res.json({
          status: "error",
          message: "Password does not matched",
        });
        return;
      }

      const updateQuery = "UPDATE usersdata SET password = ? WHERE id = ?";
      const updateParams = [encryptedPassword, userid];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "User password has been updated successfully",
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

//update admin transaction password
router.post("/updatetransactionpassword", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;
    const oldpassword = CleanHTMLData(
      CleanDBData(postData.old_admin_transaction_password)
    );
    const newpassword = CleanHTMLData(
      CleanDBData(postData.admin_transaction_password)
    );

    if (authUser) {
      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [authUser]);

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
        selectUserResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(oldpassword, decryptedPassword);

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Incorrect old transaction password",
          p: passwordMatch,
        });
        return;
      }

      const updateQuery =
        "UPDATE usersdata SET admin_transaction_password = ? WHERE id = ?";
      const updateParams = [encryptedPassword, authUser];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Transaction password has been updated successfully",
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

router.post("/blockuser", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    if (authUser) {
      const updateQuery = "UPDATE usersdata SET login_status = ? WHERE id = ?";
      const updateParams = ["Block", userid];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "User has been block successfully",
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

router.post("/unblockuser", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;
    const userid = CleanHTMLData(CleanDBData(postData.userid));
    if (authUser) {
      const updateQuery = "UPDATE usersdata SET login_status = ? WHERE id = ?";
      const updateParams = ["Unblock", userid];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "User has been unblock successfully",
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

// start kyc routs
router.post("/kycreport", async (req, res) => {
  const todayDate = await getCurrentTime();
  const postData = req.body;
  const status = CleanHTMLData(CleanDBData(postData.status));

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const getKYC = `SELECT k.*, ud.username 
      FROM kyc k
      left join usersdata ud on k.userid = ud.id
      where k.status = ?
      ORDER BY id DESC`;
      const kycData = await Qry(getKYC,[status]);
      const imageURL = `${backoffice_link}uploads/kyc/`;

      res.json({
        status: "success",
        data: kycData,
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

router.post("/approvekyc", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const kycId = CleanHTMLData(CleanDBData(postData.id));
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const selectkycQuery = `SELECT * FROM kyc WHERE id = ?`;
      const selectkycResult = await Qry(selectkycQuery, [kycId]);

      const updateKYC = await Qry("update kyc set status = ? where id = ?", [
        "Approved",
        kycId,
      ]);
      const updateUser = await Qry(
        "update usersdata set kyc_status = ? where id = ?",
        ["Verified", selectkycResult[0].userid]
      );

      res.json({
        status: "success",
        data: "KYC has been approved successfully.",
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

router.post("/rejectkyc", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const kycId = CleanHTMLData(CleanDBData(postData.id));
    const reason = CleanHTMLData(CleanDBData(postData.reason));
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const selectkycQuery = `SELECT * FROM kyc WHERE id = ?`;
      const selectkycResult = await Qry(selectkycQuery, [kycId]);

      const updateKYC = await Qry("update kyc set status = ?, reason = ? where id = ?", [
        "Rejected",reason,
        kycId,
      ]);
      const updateUser = await Qry(
        "update usersdata set kyc_status = ? where id = ?",
        ["Rejected", selectkycResult[0].userid]
      );

      res.json({
        status: "success",
        data: "KYC has been rejected successfully.",
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
// end kyc routs

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

router.post("/selecttransactions", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res);

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

      const selectTransactionsQuery = `SELECT t.id as tid, t.*, u1.username as senderusername, u2.username as receiverusername FROM transaction t 
    LEFT JOIN usersdata u1 ON t.senderid = u1.id 
    LEFT JOIN usersdata u2 ON t.receiverid = u2.id 
    WHERE t.type = ? ${statuscondition}`;
      const selectTransactionsResult = await Qry(selectTransactionsQuery, [
        type,
      ]);

      res.status(200).json({
        status: "success",
        data: selectTransactionsResult,
        backendUrl: backoffice_link + 'uploads/payments/'
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ status: "error", message: e.message });
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

//Update Product Detail
router.post("/updateproduct/", upload.single("image"), async (req, res) => {
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

//last 7 days transaction
router.post("/lastweektransactions", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const transactionSelect = await Qry(`
      SELECT * 
      FROM transaction
      WHERE createdat > DATE(NOW() - INTERVAL 7 DAY) AND (senderid = '${authUser}' OR receiverid = '${authUser}')
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

// count all active users

router.post("/getactiveusers", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const GetActiveUsers = `SELECT COUNT(*) as total_active_users FROM usersdata WHERE status = 'Approved'`;
      const TotalActiveUsers = await Qry(GetActiveUsers);

      res.json({
        status: "success",
        data: TotalActiveUsers,
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

//count all inactive users

router.post("/getinactiveusers", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const GetInActiveUsers = `SELECT COUNT(*) as total_inactive_users FROM usersdata WHERE status = 'unapproved'`;
      const TotalInActiveUsers = await Qry(GetInActiveUsers);

      res.json({
        status: "success",
        data: TotalInActiveUsers,
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

//count all users

router.post("/getallusers", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const GetAllUsers = `SELECT *  FROM usersdata where id > 1`;
      let TotalUsers = await Qry(GetAllUsers);
     const customUser = {id:0,randomcode:'0000',username:'All users', firstname:'All', lastname:'Users'}
     TotalUsers.unshift(customUser)
      res.json({
        status: "success",
        data: TotalUsers,
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



router.post("/sendmessage", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      let randomCode 
      if(!req.body.randomcode)
      {
        randomCode = randomToken(10);
      }else{
        randomCode = CleanHTMLData(CleanDBData(req.body.randomcode));
      }
      let userid = CleanHTMLData(CleanDBData(req.body.userid));
      const receiverdata = await Qry(`select username from usersdata where id = ?`,[userid])
      const title = CleanHTMLData(CleanDBData(req.body.title));
      const message = req.body.message;
      if(userid === 0)
      {
        userid = 'all'
        await Qry(`update usersdata set newMessage = ?`,[1])
      }
      const insertMessage = await Qry(`insert into messages (randomcode,sender,receiver,title,message,createdat) values (?,?,?,?,?,?)`,[randomCode,'admin',userid,title,message,todayDate]);
      await Qry(`update usersdata set newMessage = ? where id = ?`,[1, userid])

     if(insertMessage.affectedRows > 0)
     {
      res.json({
        status: "success",
        message: "Message sent successfully",
        data:{
          sender:'admin',
          title,
          message,
          createdat:todayDate,
          senderusername:receiverdata[0]?.username
        }
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


router.post("/getmessageslistDropDown", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
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
                where (receiver = 'admin') 
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
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const type = CleanHTMLData(CleanDBData(req.body.type));
      const userid = CleanHTMLData(CleanDBData(req.body.userid));

      const GetAllMessages = `
      SELECT m.*, s.username  as senderusername,r.username as receiverusername
      , 	CASE 
              WHEN ms.messageid IS NOT NULL THEN 'seen'
              ELSE 'unseen'
          END AS mstatus
      FROM messages m 
            left join usersdata s on s.id = m.sender
            left join usersdata r on r.id = m.receiver
            left join messagestatus ms on ms.messageid = m.id
            where (${type} = ?)
            group by randomcode
            order by id desc`;
      let TotalMessages = await Qry(GetAllMessages,[userid]);

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
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


//sum of all reffrel bonus

router.post("/getreffrelbonus", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const GetReffrelBonus = `SELECT SUM(amount) as total_referral_bonus FROM  transaction WHERE type = 'referralbonus'`;
      const TotalReffrelBonus = await Qry(GetReffrelBonus);

      res.json({
        status: "success",
        data: TotalReffrelBonus,
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

// unilevelbonus summary

//  router.post("/unilevelbonussummary", async (req, res) => {

//   try {
//     const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
//     if (authUser) {

//       const uniLevelBonus =`SELECT t.amount, u.firstname, u.lastname, t.details, t.createdat
//       FROM transaction t
//       JOIN usersdata u ON t.receiverid = u.sponsorid
//       WHERE t.type = 'unilevelbonus' AND u.sponsorid = t.receiverid `;
//       const uniLevelBonusResult = await Qry(uniLevelBonus);

//       res.json({
//         status: "success",
//         data: uniLevelBonusResult,
//       });
//     }
//   } catch (error) {
//     console.error("Error executing query:", error);
//     res.json({
//       status: "error",
//       message: "Server error occurred",
//     });
//   }
// });

// router.post("/referralbonussummary", async (req, res) => {

//   try {
//     const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
//     if (authUser) {

//       const uniLevelBonus =`SELECT t.amount, u.firstname, u.lastname, t.details, t.createdat
//       FROM transaction t
//       JOIN usersdata u ON t.senderid = u.id
//       WHERE t.type = 'referralbonus' AND u.id = t.senderid `;
//       const uniLevelBonusResult = await Qry(uniLevelBonus);

//       res.json({
//         status: "success",
//         data: uniLevelBonusResult,
//       });
//     }
//   } catch (error) {
//     console.error("Error executing query:", error);
//     res.json({
//       status: "error",
//       message: "Server error occurred",
//     });
//   }
// });

// router.post("/depositsummary", async (req, res) => {

//   try {
//     const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
//     if (authUser) {

//       const uniLevelBonus =`SELECT t.amount, u.firstname, u.lastname, t.details, t.createdat
//       FROM transaction t
//       JOIN usersdata u ON t.senderid = u.id
//       WHERE t.type = 'deposit' AND u.id = t.senderid `;
//       const uniLevelBonusResult = await Qry(uniLevelBonus);

//       res.json({
//         status: "success",
//         data: uniLevelBonusResult,
//       });
//     }
//   } catch (error) {
//     console.error("Error executing query:", error);
//     res.json({
//       status: "error",
//       message: "Server error occurred",
//     });
//   }
// });

//Transcation Summaries

const summaryTypes = ["unilevelbonus", "referralbonus", "deposit"];
summaryTypes.forEach((type) => {
  router.post(`/${type}summary`, async (req, res) => {
    const todayDate = await getCurrentTime();

    try {
      const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
      if (authUser) {
        const uniLevelBonus = `SELECT t.amount, u.firstname, u.lastname, t.details, t.createdat
            FROM transaction t
            JOIN usersdata u ON t.${type === "unilevelbonus" ? "receiverid" : "senderid"
          } = u.${type === "unilevelbonus" ? "sponsorid" : "id"}
            WHERE t.type = '${type}' AND u.${type === "unilevelbonus" ? "sponsorid" : "id"
          } = t.${type === "unilevelbonus" ? "receiverid" : "senderid"}`;
        const uniLevelBonusResult = await Qry(uniLevelBonus);

        res.json({
          status: "success",
          data: uniLevelBonusResult,
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
});

router.post("/verifyuseremailmanual", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const userId = postData.userid;
    const authUser = await adminAuthorization(req, res);

    if (authUser) {
      const updateQuery = `
        UPDATE usersdata
        SET emailstatus = 'verified'
        WHERE id = ?
      `;

      const updateResult = await Qry(updateQuery, [userId]);

      if (updateResult.affectedRows > 0) {
        res.status(200).json({
          status: "success",
          message: "Email status updated successfully",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Something went wrong, please try again later",
        });
      }
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

router.post("/payoutaction", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res);
    const postData = req.body;
    const action = postData.action;
    const transactionid = postData.tid;
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (authUser) {
      // Fetch transaction data
      const selectTransactionQuery = "SELECT * FROM transaction WHERE id = ?";
      const selectTransactionResult = await Qry(selectTransactionQuery, [
        transactionid,
      ]);
      const transactionData = selectTransactionResult[0];
      const userid = transactionData.receiverid;
      const rejectAmount = transactionData.amount;

      // Fetch user data
      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [userid]);
      const userData = selectUserResult[0];
      const username = userData.username;
      const email = userData.email;

      if (action === "approved") {
        // Update transaction status to 'approved'
        const updateTransactionQuery =
          "UPDATE transaction SET status = ?, approvedat = ? WHERE id = ?";
        await Qry(updateTransactionQuery, ["approved", date, transactionid]);

        res.json({
          status: "success",
          message: "withdrawal approved successfully",
        });

        // Email variables
        // const company = company_name;

        // const title = "Payout Approved";
        // const emailimg = emailImagesLink + "payout.png";
        // const heading = "Payout Approved";
        // const subheading = "The recent payout request is approved successfully";
        // const body =
        //   '<p style="text-align:left">Hello ' +
        //   username +
        //   " <br> your payout request of $" +
        //   transactionData.amount +
        //   " successfully approved  and sent to your desired account</p>";

        // const mailOptions = {
        //   from: {
        //     name: "Elevated market place",
        //     address: noreply_email,
        //   },
        //   to: {
        //     name: username,
        //     address: email,
        //   },
        //   subject: "Payout Approved on " + company_name,
        //   html: emailTemplate(
        //     title,
        //     emailimg,
        //     heading,
        //     subheading,
        //     body,
        //     company_name
        //   ),
        //   text: body,
        // };

        // transporter.sendMail(mailOptions, (err, info) => {
        //   if (err) {
        //     console.error("Error sending email:", err);
        //     res.json({
        //       status: "success",
        //       message: "withdrawal approved but email not sent",
        //       error: err,
        //     });
        //   } else {
        //     res.json({
        //       status: "success",
        //       message: "withdrawal approved successfully",
        //     });
        //   }
        // });
      }

      if (action === "rejected") {
        const reason = postData.reason;
        // Update transaction status to 'rejected' and provide a reason
        const updateTransactionQuery =
          "UPDATE transaction SET status = ?, rejectreason = ?, approvedat = ? WHERE id = ?";
        await Qry(updateTransactionQuery, [
          "rejected",
          reason,
          date,
          transactionid,
        ]);

        // Update user account balance
        const updateUserQuery =
          "UPDATE usersdata SET current_balance = current_balance + ? WHERE id = ?";
        await Qry(updateUserQuery, [rejectAmount, userid]);

        res.json({
          status: "success",
          message: "withdrawal rejected successfully",
        });

        // Email variables
        //     const company = company_name;
        //     const title = "Payout Rejected";
        //     const emailimg = emailImagesLink + "payout.png";
        //     const heading = "Payout Rejected";
        //     const subheading = "The recent payout request is rejected";
        //     const body = `<p style="text-align:left">Hello ${username} <br> your payout request of $${transactionData.amount} has been rejected
        //     <br>
        //     <b>Reason: ${reason}</b>
        //     </p>
        // `;

        //     const mailOptions = {
        //       from: {
        //         name: "Elevated market place",
        //         address: noreply_email,
        //       },
        //       to: {
        //         name: username,
        //         address: email,
        //       },
        //       subject: "Payout Rejected on " + company_name,
        //       html: emailTemplate(
        //         title,
        //         emailimg,
        //         heading,
        //         subheading,
        //         body,
        //         company_name
        //       ),
        //       text: body,
        //     };

        //     transporter.sendMail(mailOptions, (err, info) => {
        //       if (err) {
        //         console.error("Error sending email:", err);
        //         res.json({
        //           status: "success",
        //           message: "withdrawal rejected but email not sent",
        //           error: err,
        //         });
        //       } else {
        //         res.json({
        //           status: "success",
        //           message: "withdrawal rejected successfully",
        //         });
        //       }
        //     });
      }
    }
  } catch (e) {
    console.log(e)
    res.status(500).json({ status: "error", message: e.message });
  }
});


router.post("/pendingdepositaction", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res);
    const postData = req.body;
    const action = postData.action;
    const transactionid = postData.tid;
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (authUser) {
      // Fetch transaction data
      const selectTransactionQuery = "SELECT * FROM transaction WHERE id = ?";
      const selectTransactionResult = await Qry(selectTransactionQuery, [
        transactionid,
      ]);
      const transactionData = selectTransactionResult[0];
      const userid = transactionData.senderid;
      const amount = transactionData.amount;

      // Fetch user data
      const selectUserQuery = "SELECT * FROM usersdata WHERE id = ?";
      const selectUserResult = await Qry(selectUserQuery, [userid]);
      const userData = selectUserResult[0];
      const username = userData.username;
      const email = userData.email;

      if (action === "approved") {
        // Update transaction status to 'approved'
        const updateTransactionQuery =
          "UPDATE transaction SET status = ?, approvedat = ? WHERE id = ?";
        await Qry(updateTransactionQuery, ["approved", date, transactionid]);

        // Update user account balance
        const updateUserQuery =
          "UPDATE usersdata SET deposit_balance = deposit_balance + ? WHERE id = ?";
        await Qry(updateUserQuery, [amount, userid]);

        res.json({
          status: "success",
          message: "Deposit has been approved successfully",
        });

        // Email variables
        // const company = company_name;

        // const title = "Payout Approved";
        // const emailimg = emailImagesLink + "payout.png";
        // const heading = "Payout Approved";
        // const subheading = "The recent payout request is approved successfully";
        // const body =
        //   '<p style="text-align:left">Hello ' +
        //   username +
        //   " <br> your payout request of $" +
        //   transactionData.amount +
        //   " successfully approved  and sent to your desired account</p>";

        // const mailOptions = {
        //   from: {
        //     name: "Elevated market place",
        //     address: noreply_email,
        //   },
        //   to: {
        //     name: username,
        //     address: email,
        //   },
        //   subject: "Payout Approved on " + company_name,
        //   html: emailTemplate(
        //     title,
        //     emailimg,
        //     heading,
        //     subheading,
        //     body,
        //     company_name
        //   ),
        //   text: body,
        // };

        // transporter.sendMail(mailOptions, (err, info) => {
        //   if (err) {
        //     console.error("Error sending email:", err);
        //     res.json({
        //       status: "success",
        //       message: "withdrawal approved but email not sent",
        //       error: err,
        //     });
        //   } else {
        //     res.json({
        //       status: "success",
        //       message: "withdrawal approved successfully",
        //     });
        //   }
        // });
      }

      if (action === "rejected") {
        const reason = postData.reason;
        // Update transaction status to 'rejected' and provide a reason
        const updateTransactionQuery =
          "UPDATE transaction SET status = ?, rejectreason = ?, approvedat = ? WHERE id = ?";
        await Qry(updateTransactionQuery, [
          "rejected",
          reason,
          date,
          transactionid,
        ]);


        res.json({
          status: "success",
          message: "Deposit has been rejected successfully",
        });

        // Email variables
        //     const company = company_name;
        //     const title = "Payout Rejected";
        //     const emailimg = emailImagesLink + "payout.png";
        //     const heading = "Payout Rejected";
        //     const subheading = "The recent payout request is rejected";
        //     const body = `<p style="text-align:left">Hello ${username} <br> your payout request of $${transactionData.amount} has been rejected
        //     <br>
        //     <b>Reason: ${reason}</b>
        //     </p>
        // `;

        //     const mailOptions = {
        //       from: {
        //         name: "Elevated market place",
        //         address: noreply_email,
        //       },
        //       to: {
        //         name: username,
        //         address: email,
        //       },
        //       subject: "Payout Rejected on " + company_name,
        //       html: emailTemplate(
        //         title,
        //         emailimg,
        //         heading,
        //         subheading,
        //         body,
        //         company_name
        //       ),
        //       text: body,
        //     };

        //     transporter.sendMail(mailOptions, (err, info) => {
        //       if (err) {
        //         console.error("Error sending email:", err);
        //         res.json({
        //           status: "success",
        //           message: "withdrawal rejected but email not sent",
        //           error: err,
        //         });
        //       } else {
        //         res.json({
        //           status: "success",
        //           message: "withdrawal rejected successfully",
        //         });
        //       }
        //     });
      }
    }
  } catch (e) {
    console.log(e)
    res.status(500).json({ status: "error", message: e.message });
  }
});

//select any report
router.post("/report", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const reportType = CleanHTMLData(CleanDBData(postData.type));
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token

    if (authUser) {
      const reportSelectQuery = `
      SELECT t.id as id, u1.username AS senderusername, u2.username AS receiverusername, t.amount, t.createdat, t.approvedat, t.status, t.details, t.type,t.rejectreason, t.hash, t.payoutmethod, t.payoutaccount1, t.payoutaccount2, t.payoutaccount3, t.seen
      FROM transaction t
      LEFT JOIN usersdata u1 ON t.senderid = u1.id
      LEFT JOIN usersdata u2 ON t.receiverid = u2.id
      WHERE t.type=? and t.status = ? ORDER BY t.id DESC`;

      const reportSelectParams = [reportType,'approved'];
      let reportSelectResult = await Qry(reportSelectQuery, reportSelectParams);

      if (reportSelectResult.length < 1) {
        reportSelectResult = [];
      }

      // Convert UTC timestamps to local time
      reportSelectResult.forEach(row => {
        row.createdat = new Date(row.createdat).toLocaleString();
        row.approvedat = new Date(row.approvedat).toLocaleString();
        // Convert other datetime fields if needed
      });

      res.json({
        status: "success",
        data: reportSelectResult,
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
router.post("/getbinarytree1", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res);
    const postData = req.body;
    const userrandomcode = postData.userrandomcode;
    const users = {};

    if (authUser) {
      const selectUser = await Qry(
        "SELECT * FROM usersdata WHERE randomcode = ?",
        [userrandomcode]
      );
      const userData = selectUser[0];

      const user1 = userData.id;
      const user1_data = (await getUserData(user1)).split("*");
      const [
        user1_username,
        user1_sponsorname,
        user1_randomcode,
        user1_picture,
        user1_fullname,
        user1_sponsorfullname,
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
      ] = user2_data;

      const user3_data = (await getUserData(user3)).split("*");
      const [
        user3_username,
        user3_sponsorname,
        user3_randomcode,
        user3_picture,
        user3_fullname,
        user3_sponsorfullname,
      ] = user3_data;

      const user4_data = (await getUserData(user4)).split("*");
      const [
        user4_username,
        user4_sponsorname,
        user4_randomcode,
        user4_picture,
        user4_fullname,
        user4_sponsorfullname,
      ] = user4_data;

      const user5_data = (await getUserData(user5)).split("*");
      const [
        user5_username,
        user5_sponsorname,
        user5_randomcode,
        user5_picture,
        user5_fullname,
        user5_sponsorfullname,
      ] = user5_data;

      const user6_data = (await getUserData(user6)).split("*");
      const [
        user6_username,
        user6_sponsorname,
        user6_randomcode,
        user6_picture,
        user6_fullname,
        user6_sponsorfullname,
      ] = user6_data;

      const user7_data = (await getUserData(user7)).split("*");
      const [
        user7_username,
        user7_sponsorname,
        user7_randomcode,
        user7_picture,
        user7_fullname,
        user7_sponsorfullname,
      ] = user7_data;

      const user8_data = (await getUserData(user8)).split("*");
      const [
        user8_username,
        user8_sponsorname,
        user8_randomcode,
        user8_picture,
        user8_fullname,
        user8_sponsorfullname,
      ] = user8_data;

      const user9_data = (await getUserData(user9)).split("*");
      const [
        user9_username,
        user9_sponsorname,
        user9_randomcode,
        user9_picture,
        user9_fullname,
        user9_sponsorfullname,
      ] = user9_data;

      const user10_data = (await getUserData(user10)).split("*");
      const [
        user10_username,
        user10_sponsorname,
        user10_randomcode,
        user10_picture,
        user10_fullname,
        user10_sponsorfullname,
      ] = user10_data;

      const user11_data = (await getUserData(user11)).split("*");
      const [
        user11_username,
        user11_sponsorname,
        user11_randomcode,
        user11_picture,
        user11_fullname,
        user11_sponsorfullname,
      ] = user11_data;

      const user12_data = (await getUserData(user12)).split("*");
      const [
        user12_username,
        user12_sponsorname,
        user12_randomcode,
        user12_picture,
        user12_fullname,
        user12_sponsorfullname,
      ] = user12_data;

      const user13_data = (await getUserData(user13)).split("*");
      const [
        user13_username,
        user13_sponsorname,
        user13_randomcode,
        user13_picture,
        user13_fullname,
        user13_sponsorfullname,
      ] = user13_data;

      const user14_data = (await getUserData(user14)).split("*");
      const [
        user14_username,
        user14_sponsorname,
        user14_randomcode,
        user14_picture,
        user14_fullname,
        user14_sponsorfullname,
      ] = user14_data;

      const user15_data = (await getUserData(user15)).split("*");
      const [
        user15_username,
        user15_sponsorname,
        user15_randomcode,
        user15_picture,
        user15_fullname,
        user15_sponsorfullname,
      ] = user15_data;

      users.user1 = {
        username: user1_username,
        sponsorname: user1_sponsorname,
        randomcode: user1_randomcode,
        profilepicture: user1_picture,
        fullname: user1_fullname,
        sponsorfullname: user1_sponsorfullname,
      };

      users.user2 = {
        username: user2_username,
        sponsorname: user2_sponsorname,
        randomcode: user2_randomcode,
        profilepicture: user2_picture,
        fullname: user2_fullname,
        sponsorfullname: user2_sponsorfullname,
      };

      users.user3 = {
        username: user3_username,
        sponsorname: user3_sponsorname,
        randomcode: user3_randomcode,
        profilepicture: user3_picture,
        fullname: user3_fullname,
        sponsorfullname: user3_sponsorfullname,
      };

      users.user4 = {
        username: user4_username,
        sponsorname: user4_sponsorname,
        randomcode: user4_randomcode,
        profilepicture: user4_picture,
        fullname: user4_fullname,
        sponsorfullname: user4_sponsorfullname,
      };

      users.user5 = {
        username: user5_username,
        sponsorname: user5_sponsorname,
        randomcode: user5_randomcode,
        profilepicture: user5_picture,
        fullname: user5_fullname,
        sponsorfullname: user5_sponsorfullname,
      };

      users.user6 = {
        username: user6_username,
        sponsorname: user6_sponsorname,
        randomcode: user6_randomcode,
        profilepicture: user6_picture,
        fullname: user6_fullname,
        sponsorfullname: user6_sponsorfullname,
      };

      users.user7 = {
        username: user7_username,
        sponsorname: user7_sponsorname,
        randomcode: user7_randomcode,
        profilepicture: user7_picture,
        fullname: user7_fullname,
        sponsorfullname: user7_sponsorfullname,
      };

      users.user8 = {
        username: user8_username,
        sponsorname: user8_sponsorname,
        randomcode: user8_randomcode,
        profilepicture: user8_picture,
        fullname: user8_fullname,
        sponsorfullname: user8_sponsorfullname,
      };

      users.user9 = {
        username: user9_username,
        sponsorname: user9_sponsorname,
        randomcode: user9_randomcode,
        profilepicture: user9_picture,
        fullname: user9_fullname,
        sponsorfullname: user9_sponsorfullname,
      };

      users.user10 = {
        username: user10_username,
        sponsorname: user10_sponsorname,
        randomcode: user10_randomcode,
        profilepicture: user10_picture,
        fullname: user10_fullname,
        sponsorfullname: user10_sponsorfullname,
      };

      users.user11 = {
        username: user11_username,
        sponsorname: user11_sponsorname,
        randomcode: user11_randomcode,
        profilepicture: user11_picture,
        fullname: user11_fullname,
        sponsorfullname: user11_sponsorfullname,
      };

      users.user12 = {
        username: user12_username,
        sponsorname: user12_sponsorname,
        randomcode: user12_randomcode,
        profilepicture: user12_picture,
        fullname: user12_fullname,
        sponsorfullname: user12_sponsorfullname,
      };

      users.user13 = {
        username: user13_username,
        sponsorname: user13_sponsorname,
        randomcode: user13_randomcode,
        profilepicture: user13_picture,
        fullname: user13_fullname,
        sponsorfullname: user13_sponsorfullname,
      };

      users.user14 = {
        username: user14_username,
        sponsorname: user14_sponsorname,
        randomcode: user14_randomcode,
        profilepicture: user14_picture,
        fullname: user14_fullname,
        sponsorfullname: user14_sponsorfullname,
      };

      users.user15 = {
        username: user15_username,
        sponsorname: user15_sponsorname,
        randomcode: user15_randomcode,
        profilepicture: user15_picture,
        fullname: user15_fullname,
        sponsorfullname: user15_sponsorfullname,
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
    res.status(500).json({ status: "error", message: e.message });
  }
});

router.post("/getbinarytree", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    try {
      const authUser = await adminAuthorization(req, res);
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
          user1_investment,
          
        ] = user1_data;
  
        const level1_users = await getBinaryTreeUsers(user1);
        console.log("level1_users",level1_users)
        const user2 = level1_users[0];
        const user3 = level1_users[1];
        const user4 = level1_users[2];
        const user5 = level1_users[3];
        const user6 = level1_users[4];
        const user7 = level1_users[5];
  
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
          user2_investment,
          
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
          user3_investment,
          
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
          user4_investment,
          
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
          user5_investment,
          
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
          user6_investment,
          
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
          user7_investment,
          
        ] = user7_data;
  
       
        users.user1 = {
          username: user1_username,
          sponsorname: user1_sponsorname,
          randomcode: user1_randomcode,
          profilepicture: user1_picture,
          fullname: user1_fullname,
          sponsorfullname: user1_sponsorfullname,
          total_left_points: user1_total_left_points,
          total_right_points: user1_total_right_points,
          investment: user1_investment,
          
        };
  
        users.user2 = {
          username: user2_username,
          sponsorname: user2_sponsorname,
          randomcode: user2_randomcode,
          profilepicture: user2_picture,
          fullname: user2_fullname,
          sponsorfullname: user2_sponsorfullname,
          total_left_points: user2_total_left_points,
          total_right_points: user2_total_right_points,
          investment: user2_investment,
          
        };
  
        users.user3 = {
          username: user3_username,
          sponsorname: user3_sponsorname,
          randomcode: user3_randomcode,
          profilepicture: user3_picture,
          fullname: user3_fullname,
          sponsorfullname: user3_sponsorfullname,
          total_left_points: user3_total_left_points,
          total_right_points: user3_total_right_points,
          investment: user3_investment,
          
        };
  
        users.user4 = {
          username: user4_username,
          sponsorname: user4_sponsorname,
          randomcode: user4_randomcode,
          profilepicture: user4_picture,
          fullname: user4_fullname,
          sponsorfullname: user4_sponsorfullname,
          total_left_points: user4_total_left_points,
          total_right_points: user4_total_right_points,
          investment: user4_investment,
          
        };
  
        users.user5 = {
          username: user5_username,
          sponsorname: user5_sponsorname,
          randomcode: user5_randomcode,
          profilepicture: user5_picture,
          fullname: user5_fullname,
          sponsorfullname: user5_sponsorfullname,
          total_left_points: user5_total_left_points,
          total_right_points: user5_total_right_points,
          investment: user5_investment,
          
        };
  
        users.user6 = {
          username: user6_username,
          sponsorname: user6_sponsorname,
          randomcode: user6_randomcode,
          profilepicture: user6_picture,
          fullname: user6_fullname,
          sponsorfullname: user6_sponsorfullname,
          total_left_points: user6_total_left_points,
          total_right_points: user6_total_right_points,
          investment: user6_investment,
          
        };
  
        users.user7 = {
          username: user7_username,
          sponsorname: user7_sponsorname,
          randomcode: user7_randomcode,
          profilepicture: user7_picture,
          fullname: user7_fullname,
          sponsorfullname: user7_sponsorfullname,
          total_left_points: user7_total_left_points,
          total_right_points: user7_total_right_points,
          investment: user7_investment,
          
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
      console.error(e)
      res.status(500).json({ status: "error", message: e.message });
    }
  });
router.post("/createusersession", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const userid = CleanHTMLData(CleanDBData(postData.userId));
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const userSelectResult = await Qry(
        `SELECT username FROM usersdata WHERE id = ?`,
        [userid]
      );
      if (userSelectResult.length > 0) {
        const userdbData = userSelectResult[0];
        const username = userdbData.username;
        const token = jwt.sign({ username, createdby: authUser }, secretKey, {
          expiresIn: "1h",
        });

        res.json({
          status: "success",
          accessurl: weblink + "login/" + token + "/manual/",
        });
      } else {
        res.json({
          status: "error",
          data: "user not found",
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

router.post("/getcountries", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const countrySelectResult = await Qry(
        `SELECT id,name,iso2 FROM countries order by name asc`
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
    }
  } catch (error) {
    console.error("Error executing query:", error);
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
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const statesSelectResult = await Qry(
        `SELECT id,name FROM states where country_id = ? order by name asc`,
        [countryid]
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
    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/addnewshippigcharges", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const countryid = CleanHTMLData(CleanDBData(postData?.countryid));
  const stateid = CleanHTMLData(CleanDBData(postData?.stateid));
  const cityid = CleanHTMLData(CleanDBData(postData?.cityid));
  const amount = CleanHTMLData(CleanDBData(postData?.amount));
  const amountkg = CleanHTMLData(CleanDBData(postData?.amountkg));

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const updateCountry = await Qry(
        `update countries set enable = ? where id = ?`,
        ["1", countryid]
      );
      const updateState = await Qry(
        `update states set enable = ? where id = ?`,
        ["1", stateid]
      );
      const updateCity = await Qry(
        `update cities set enable = ? where id = ?`,
        ["1", cityid]
      );

      const insertShipping = await Qry(
        `insert into shipppingcost (country_id, state_id, city_id,amount,amountkg) values (?,?,?,?,?)`,
        [countryid, stateid, cityid, amount, amountkg]
      );
      if (
        updateCountry.affectedRows > 0 &&
        updateState.affectedRows > 0 &&
        updateCity.affectedRows > 0 &&
        insertShipping.affectedRows > 0
      ) {
        res.json({
          status: "success",
          message: "new shipping details added successfully",
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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

router.post("/getshippinglist", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const shippingList =
        await Qry(`select  sc.amount,sc.amountkg,sc.id as tid, c.name as country, s.name as state, ct.name as city from shipppingcost sc
      left join countries c on c.id = sc.country_id 
      left join states s on s.id = sc.state_id 
      left join cities ct on ct.id  = sc.city_id
      order by sc.id desc`);

      if (shippingList.length > 0) {
        res.json({
          status: "success",
          data: shippingList,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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

router.post("/deleteshippinglist", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const id = CleanHTMLData(CleanDBData(postData.id));
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const selectShipping = await Qry(
        `select *  from shipppingcost where id = ?`,
        [id]
      );
      const countryid = selectShipping[0].country_id;
      const stateid = selectShipping[0].state_id;
      const cityid = selectShipping[0].city_id;

      const delshipping = await Qry(`delete from shipppingcost where id = ?`, [
        id,
      ]);
      const updateCountry = await Qry(
        `update countries set enable = ? where id = ?`,
        ["0", countryid]
      );
      const updateState = await Qry(
        `update states set enable = ? where id = ?`,
        ["0", stateid]
      );
      const updateCity = await Qry(
        `update cities set enable = ? where id = ?`,
        ["0", cityid]
      );

      if (
        updateCountry.affectedRows > 0 &&
        updateState.affectedRows > 0 &&
        updateCity.affectedRows > 0 &&
        delshipping.affectedRows > 0
      ) {
        res.json({
          status: "success",
          message: "deleted successfully",
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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

router.post("/updateaccount", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;
    if (authUser) {
      const id = CleanHTMLData(CleanDBData(postData.id));

      const selectUserQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [id]);
      const userData = selectUserResult[0];
      let loginstatus = selectUserResult[0]["loginstatus"];

      if (selectUserResult.length === 0) {
        res.json({
          status: "error",
          message: "No account found with this username",
        });
        return;
      }
      if (loginstatus === "block") {
        const updateQuery =
          "UPDATE usersdata SET loginstatus = ?  WHERE id = ?";
        const updateParams = ["unblock", id];
        const updateResult = await Qry(updateQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Account unblock successfully",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to unblock account Address",
          });
        }
      } else if (loginstatus === "unblock") {
        const updateQuery =
          "UPDATE usersdata SET loginstatus = ?  WHERE id = ?";
        const updateParams = ["block", id];
        const updateResult = await Qry(updateQuery, updateParams);

        if (updateResult.affectedRows > 0) {
          res.json({
            status: "success",
            message: "Account block successfully",
          });
        } else {
          res.json({
            status: "error",
            message: "Failed to unblock account Address",
          });
        }
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

// Select Packages Data
router.post("/getpackagesdata", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const packagesSelectResult = await Qry(`SELECT * FROM packages`);
      if (packagesSelectResult.length > 0) {
        res.json({
          status: "success",
          data: packagesSelectResult,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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

// Update Packages Data
router.post("/updatepackages", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const id = CleanHTMLData(CleanDBData(postData.id));
      const title = CleanHTMLData(CleanDBData(postData.title));
      const amount = CleanHTMLData(CleanDBData(postData.amount));
      const weekly_cap = CleanHTMLData(CleanDBData(postData.weekly_cap));

      const updateQuery = "UPDATE packages SET title = ?, amount = ?, weekly_cap = ? WHERE id = ?";
      const updateParams = [title, amount, weekly_cap, id];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Package updated successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to update Packages!",
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

// Update Stockist Data
router.post("/updatestockistsdata", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const id = CleanHTMLData(CleanDBData(postData.id));
      const storename = CleanHTMLData(CleanDBData(postData.storename));
      const mobile = CleanHTMLData(CleanDBData(postData.mobile));
      const address = CleanHTMLData(CleanDBData(postData.address));
      const city = CleanHTMLData(CleanDBData(postData.city));
      const country = CleanHTMLData(CleanDBData(postData.country));

      const updateQuery = "UPDATE usersdata SET storename = ?, mobile = ?, address = ?, city = ?, country = ?, stockist = ? WHERE id = ?";
      const updateParams = [storename, mobile, address, city, country, 'enable', id];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Stockist enable successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to enable Stockist",
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

// Update Stockist Status
router.post("/updatestockiststatus", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const id = CleanHTMLData(CleanDBData(postData.id));

      const updateQuery = "UPDATE usersdata SET stockist = ? WHERE id = ?";
      const updateParams = ['disabled', id];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Stockist disabled successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to disabled Stockist",
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

// Select Ranks Data
router.post("/getranksdata", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const ranksSelectResult = await Qry(`SELECT * FROM ranks`);
      if (ranksSelectResult.length > 0) {
        res.json({
          status: "success",
          data: ranksSelectResult,
        });
      } else {
        res.json({
          status: "error",
          data: "not found",
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

// Update Ranks Data
router.post("/updateranks", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const id = CleanHTMLData(CleanDBData(postData.id));
      const ranks_name = CleanHTMLData(CleanDBData(postData.ranks_name));
      const lesser_leg_Points = CleanHTMLData(CleanDBData(postData.lesser_leg_Points));
      const incentives = CleanHTMLData(CleanDBData(postData.incentives));
      const cash = CleanHTMLData(CleanDBData(postData.cash));
      const pool_bonus = CleanHTMLData(CleanDBData(postData.pool_bonus));

      const updateQuery = "UPDATE ranks SET ranks_name = ?, lesser_leg_Points = ?, incentives = ?, cash = ?, pool_bonus = ? WHERE id = ?";
      const updateParams = [ranks_name, lesser_leg_Points, incentives, cash, pool_bonus, id];
      const updateResult = await Qry(updateQuery, updateParams);

      if (updateResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "Ranks updated successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to update Ranks!",
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

router.post("/getcities", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const countryid = CleanHTMLData(CleanDBData(postData.countryid));
  try {
    const citiesSelectResult = await Qry(
      `SELECT id,name FROM cities where country_id = ?  order by name asc`, [countryid]
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
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

// Add New Cities
router.post("/addnewcity", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const cityname = CleanHTMLData(CleanDBData(postData.cityname));
      const countryid = CleanHTMLData(CleanDBData(postData.countryid));
      const countrycode = CleanHTMLData(CleanDBData(postData.countrycode));

      const insertQuery = "INSERT INTO cities (name, `country_id`, `country_code`, `state_id`) VALUES (?, ?, ?, ?)";
      const insertParams = [cityname, countryid, countrycode, 488];
      const insertResult = await Qry(insertQuery, insertParams);

      if (insertResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "City name added successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to add city name!",
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

//GET ALL CITIES
router.post("/getallcities", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const countryid = CleanHTMLData(CleanDBData(postData.countryid));
  try {
    const citiesSelectResult = await Qry(
      `SELECT id,name,country_code FROM cities order by id desc`,
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
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

//Delete City
router.post("/deletecity", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token

    if (authUser) {
      const postData = req.body;
      const id = CleanHTMLData(CleanDBData(postData.id));

      const deleteQuery = "DELETE from cities WHERE id = ?";
      const deleteParams = [id];
      const deleteResult = await Qry(deleteQuery, deleteParams);

      if (deleteResult.affectedRows > 0) {
        res.json({
          status: "success",
          message: "City deleted successfully!",
        });
      } else {
        res.json({
          status: "error",
          message: "Failed to delete city",
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

//get stockist users
router.post("/getstockistusers", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const countryid = CleanHTMLData(CleanDBData(postData.countryid));
  try {
    const stockistUsersResult = await Qry(
      `SELECT username,firstname,lastname,email,mobile,address,city,country,storename FROM usersdata WHERE stockist = ?`, ['enable']
    );
    if (stockistUsersResult.length > 0) {
      res.json({
        status: "success",
        data: stockistUsersResult,
      });
    } else {
      res.json({
        status: "error",
        data: "not found",
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



//get deposit wallets
router.post("/getdepositwallets", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const keynames = postData.keynames;
    const authUser = await adminAuthorization(req, res); // Assuming check_authorization() checks the authorization token

    if (authUser) {
      const userSelect = await Qry(
        "SELECT id as tid, keyname, keyvalue FROM setting WHERE keyname IN (" +
        keynames +
        ")"
      );
      const userslist = [];
      const usersdata = { entries: [] };

      for (const usersdbData of userSelect) {
        const user = JSON.parse(usersdbData.keyvalue);
        user.tid = usersdbData.tid; // Add the 'tid' column to the user object
        userslist.push(user);
      }

      usersdata.entries = userslist;

      if (userslist.length > 0) {
        return res.json({
          status: "success",
          data: usersdata,
          picturelink: `${backoffice_link}/uploads/walletqr/`,
        });
      } else {
        return res.json({
          status: "success",
          data: usersdata,
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

//add new deposit wallet
router.post("/postdepositwallet", upload.single("image"), async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming check_authorization() checks the authorization token
    if (authUser) {
      const uploadDir = path.join(__dirname, "../public/uploads/walletqr/");
      const imageParts = req.body.image.split(";base64,");
      const imageTypeAux = imageParts[0].split("image/");
      const imageType = imageTypeAux[1];
      const imageBase64 = Buffer.from(imageParts[1], "base64");
      const filename = `${Date.now()}.png`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, imageBase64);

      date = new Date().toISOString().slice(0, 19).replace("T", " ");
      const postData = {
        obj: {
          coinname: req.body.coinname,
          walletqrcode: filename,
          walletaddress: req.body.walletaddress,
          walletmessage: req.body.walletmessage,
        },
      };
      const insData = JSON.stringify(postData.obj);

      const insertWallet = await Qry(
        "insert into setting(keyname,keyvalue) values ('depositwallet', '" +
        insData +
        "')"
      );
      if (insertWallet.affectedRows > 0) {
        res.json({
          status: "success",
          message: "New deposit wallet added successfully",
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

router.post("/getdepositlist", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const status = postData.status;
    const authUser = await adminAuthorization(req, res);
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


//update profile data
router.post("/depositaction", async (req, res) => {
  const todayDate = await getCurrentTime();

  const postData = req.body;
  const action = CleanHTMLData(CleanDBData(postData.action));
  const rowId = CleanHTMLData(CleanDBData(postData.tid));
  const randomCode = randomToken(10);
  let TreeType = ""
  try {
    const authUser = await adminAuthorization(req, res);
    let updateResult;
    if (authUser) {
      const selectTransaction = await Qry(
        `select * from transaction where id = ?`,
        [rowId]
      );
      const transactionData = selectTransaction[0];

      if (action === "approved") {
        updateResult = await Qry(
          `UPDATE transaction
        SET status = ? 
        WHERE status = 'pending' AND type = 'pyramidpayment' and id = ?`,
          [action, transactionData.id]
        );
        const userData = await Qry(`select * from usersdata where id = ?`, [transactionData.senderid]);
        // await Qry(`update usersdata set membership=?,paymentstatus = ? where id = ?`,['active','approved',transactionData.senderid]);

        const checkTree = await Qry(`select * from binarytree where userid = ?`, [transactionData.senderid])

        const sponsorTree = await Qry(`select * from binarytree where userid = ? and status = ?`, [userData[0]?.sponsorid, 'active'])
        const lastTreeId = sponsorTree[0]?.id

        if (checkTree.length > 0) { TreeType = 'rejoin' }
        else { TreeType = 'new' }

        availableSpace = await findAvailableSpace(lastTreeId || 1);
        const insertBinaryTree = await Qry("insert into binarytree(userid,pid,leg,type) values (?, ?, ?,?)", [transactionData.senderid, availableSpace?.pid, availableSpace?.leg, TreeType]);


      } else if (action === "rejected") {
        const reason = CleanHTMLData(CleanDBData(postData.reason));
        updateResult = await Qry(
          `UPDATE transaction
        SET status = ? , details = ?
        WHERE status = 'pending' AND type = 'pyramidpayment' and id = ?`,
          [action, reason, transactionData.id]
        );

        // await Qry(`update usersdata set paymentstatus = ? where id = ?`,['rejected',transactionData.senderid]);

      } else {
        res.json({
          status: "error",
          message: "invalid action",
        });
      }

      if (updateResult.affectedRows > 0) {
        res.status(200).json({
          status: "success",
          message: "Deposit " + action + " successfully",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Something went wrong. Please try again later.",
        });
      }
    }
  } catch (e) {
    //console.log(e)
    res.status(500).json({ status: "error", message: e.message });
  }
});

//delete deposit wallet
router.post("/deletewallet", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const tid = req.body.tid;
    const authUser = await adminAuthorization(req, res); // Assuming check_authorization() checks the authorization token

    if (authUser) {
      const tdel = await Qry("DELETE FROM setting WHERE id = ?", [tid]);

      if (tdel) {
        res.json({
          status: "success",
          message: "Wallet deleted successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "Wallet was not deleted",
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

router.post("/getstockistpackages", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const type = CleanHTMLData(CleanDBData(postData.type));

    if (authUser) {
      const packageSelectResult = await Qry(
        `SELECT up.id,up.createdat,up.updatedat,up.status,up.amount,up.buyingtype, p.title as packagename, st.storename,st.address,st.mobile, st.username as stockistname, ud.username as buyername  from userpackages up 
        left join packages p on p.id = up.packageid
        left join usersdata st on st.id = up.stockistid
        left join usersdata ud on ud.id = up.userid
        where up.type = ? and up.status = ?
        order by up.id asc`, ['package', type]);
      if (packageSelectResult.length > 0) {
        res.json({
          status: "success",
          data: packageSelectResult,
        });
      } else {
        res.json({
          status: "error",
          data: `not found`,
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

router.post("/createadmin", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const username = postData.username;
    const email = postData.email;
    const firstname = postData.firstname;
    const lastname = postData.lastname;
    const password = postData.password;
    const mini_admin_transaction_password =
      postData.mini_admin_transaction_password;
    const admin_transaction_password = postData.admin_transaction_password;
    const allowedroutes = postData.allowedroutes;
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const selectUserDataQuery = `SELECT * FROM usersdata WHERE id = ?`;
      const selectUserDataResult = await Qry(selectUserDataQuery, [authUser]);

      const selectUsernameQuery = `SELECT * FROM usersdata WHERE username = ?`;
      const selectUsernameResult = await Qry(selectUsernameQuery, [username]);

      if (selectUsernameResult.length > 0) {
        res.json({
          status: "error",
          message: "The username you entered is already taken",
        });
        return;
      }

      const selectEmailQuery = `SELECT * FROM usersdata WHERE email = ?`;
      const selectEmailResult = await Qry(selectEmailQuery, [email]);

      if (selectEmailResult.length > 0) {
        res.json({
          status: "error",
          message: "An account with this email address already exists",
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

      // start encrypt password
      const hashedPassword = bcrypt.hashSync(password, options.cost);
      const encryptedPassword = crypto.AES.encrypt(
        hashedPassword,
        encryptionKey
      ).toString();
      // end encrypt password

      // start encrypt mini admin transaction password
      const tranhashedPassword = bcrypt.hashSync(
        mini_admin_transaction_password,
        options.cost
      );
      const tranencryptedPassword = crypto.AES.encrypt(
        tranhashedPassword,
        encryptionKey
      ).toString();
      // end encrypt mini admin transaction password

      const decryptedPassword = crypto.AES.decrypt(
        selectUserDataResult[0].admin_transaction_password,
        encryptionKey
      ).toString(crypto.enc.Utf8);
      const passwordMatch = bcrypt.compareSync(
        admin_transaction_password,
        decryptedPassword
      );

      if (!passwordMatch) {
        res.json({
          status: "error",
          message: "Invalid admin transaction password",
        });
        return;
      }

      const insertResult = await Qry(
        `INSERT INTO usersdata (username, password, email, firstname, lastname, allowedroutes, usertype, emailstatus, admin_transaction_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          username,
          encryptedPassword,
          email,
          firstname,
          lastname,
          allowedroutes,
          "admin",
          "verified",
          tranencryptedPassword,
        ]
      );

      res.json({
        status: "success",
        message: "Admin has been created successfully.",
      });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});

router.post("/getminiadmin", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectUserQuery = `SELECT id, username, firstname, lastname, email FROM usersdata WHERE usertype = ? and id != ?`;
      const selectUserResult = await Qry(selectUserQuery, ["admin", authUser]);
      res.status(200).json({
        status: "success",
        data: selectUserResult,
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/deleteminiadmin", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const id = postData.id;
    const authUser = await adminAuthorization(req, res);
    if (authUser) {
      const selectUserQuery = `SELECT usertype, username FROM usersdata WHERE id = ?`;
      const selectUserResult = await Qry(selectUserQuery, [id]);

      if (selectUserResult[0].usertype !== "admin") {
        res.json({
          status: "error",
          message: "Invalid mini admin. Please try again later.",
        });
        return;
      }

      const deleteUserQuery = `DELETE FROM usersdata WHERE id = ?`;
      const deleteUserResult = await Qry(deleteUserQuery, [id]);

      res.status(200).json({
        status: "success",
        message: "Admin has been deleted successfully.",
      });
    }
  } catch (e) {
    res.status(500).json({ status: "error", message: e });
  }
});

router.post("/rankachievers", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const postData = req.body;
    const type = CleanHTMLData(CleanDBData(postData.type));
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const getKYC = `SELECT rac.*, ud.username, ud.pkgid, ra.ranks_name, ra.incentives, ra.cash, pk.title
      FROM rankachievers rac
      left join usersdata ud on rac.userid = ud.id
      left join ranks ra on rac.rankid = ra.id
      left join packages pk on ud.pkgid = pk.id
      where rac.rank_bonus_status = ?
      ORDER BY rac.id DESC`;
      const kycData = await Qry(getKYC, [type]);

      res.json({
        status: "success",
        data: kycData
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

router.post("/approverankachievers", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    const postData = req.body;
    const id = CleanHTMLData(CleanDBData(postData.id));
    const type = CleanHTMLData(CleanDBData(postData.type));

    if (authUser) {
      const selectrankachievers = await Qry(`select * from rankachievers where id = ?`, [id])
      const rankachieversData = selectrankachievers[0]

      const selectRank = await Qry(`select * from ranks where id = ?`, [rankachieversData.rankid])
      const rankData = selectRank[0]

      const selectUser = await Qry(`select * from usersdata where id = ?`, [rankachieversData.userid])
      const userData = selectUser[0]
      let username = userData.username

      const date = new Date().toISOString().slice(0, 19).replace("T", " ");

      let amount = 0
      let details = ''
      let details1 = ''
      if (type === 'cash') {
        amount = rankData.cash
        await Qry(`update usersdata set current_balance = current_balance + ? where id = ?`, [amount, rankachieversData.userid])
        details = `User ${username}'s rank achievement has been approved successfuly by admin as ${type} bonus with amount $${amount}.`
        details1 = `You have been successfully get rank bonus of amount $${amount} on the base of rank "${rankData.ranksname}".`
      }
      else {
        details = `User ${username}'s rank achievement has been approved successfuly by admin as ${type} bonus with ${rankData.incentives}.`
        details1 = `You have been successfully get rank bonus as Incentives on the base of rank "${rankData.ranksname}".`
      }

      await Qry(`update rankachievers set rank_bonus_status = ?, details = ?, updatedat = ? where id = ?`, ['approved', details, date, rankachieversData.id])

      await Qry(`update usersdata set currentrank = ? where id = ?`, [rankachieversData.rankid, rankachieversData.userid])

      const insertQuery = "insert into transaction ( receiverid, senderid, amount, type, details) values ( ? , ? , ? ,? , ?)";
      const insertResult = await Qry(insertQuery, [rankachieversData.userid, 0, amount, "rankbonus", details1]);

      res.json({ status: "success", message: `Rank Achievement has been approved successfully as ${type} bonus.` });

    }
  } catch (error) {
    console.error("Error executing query:", error);
    res.json({
      status: "error",
      message: "Server error occurred",
    });
  }
});


//update message status
router.post("/updatemessage", async (req, res) => {
  const todayDate = await getCurrentTime();
  
    // Coinbase Commerce API credentials
  
   const postData = req.body;
   const msgId = CleanHTMLData(CleanDBData(postData.msgId));
   
     try {
       const authUser = await adminAuthorization(req, res); // Assuming checkAuthorization function checks the authorization token
   if(authUser)
   {
    const checkMessage = await Qry(`select * from messagestatus where messageid = ? and userid = ?`, [msgId, authUser])
    if(checkMessage.length <= 0)
    {
    await Qry(`update messages set status = ? where id = ? and receiver = ?`,['seen', msgId, 'admin'])
    await Qry(`insert into messagestatus(messageid,userid,createdat) values(?,?,?)`,[msgId, authUser, todayDate])
    }
    // Return charge information to the client
       res.json({status:"success",message:'status updated'});
     }
   } catch (error) {
       console.error('Error creating charge:', error);
       res.status(500).json({status:"error",data:error?.message});
   }
   
   });
  


 router.post("/getChat", async (req, res) => {
  const todayDate = await getCurrentTime();

  try {
    const authUser = await adminAuthorization(req, res); // Assuming adminAuthorization function checks the authorization token
    if (authUser) {
      const msgCode = CleanHTMLData(CleanDBData(req.body.msgCode));

      const GetChat = await Qry(`SELECT m.*, s.username as senderusername  FROM messages m
      left join usersdata s on s.id = m.sender
      where m.randomcode = ?`,[msgCode]);;
      
    
      res.json({
        status: "success",
        data: GetChat,
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



router.post('/weeklybinaryreport', async (req, res) => {
  
    try {
      const postData = req.body;
      const userId = postData?.userid
      const authUser = await adminAuthorization(req, res);
      if (authUser) {
  
        const reportData = await Qry(`SELECT 
        points.points,points.dat as createdat, points.leg, 
        usersdata.username as senderusername FROM  points
        JOIN  usersdata ON points.sender_id = usersdata.id
    WHERE 
        JSON_SEARCH(points.receiver_ids, 'one', ${userId}) IS NOT NULL 
        and
        dat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 7 DAY) + INTERVAL 0 SECOND
        AND dat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 1 DAY) + INTERVAL 86399 SECOND
    `) 
        res.status(200).json({
          status: 'success',
          data: reportData,
        });
      }
    } catch (e) {
      console.log(e.message)
      res.status(500).json({ status: 'error', message: e.message });
    }
  });


  router.post("/selecttransactionsweekly", async (req, res) => {
    
      try {
        const authUser = await adminAuthorization(req, res);
    
        if (authUser) {
          const postData = req.body;
          const type = CleanHTMLData(CleanDBData(postData.type));
          const status = CleanHTMLData(CleanDBData(postData.status));
          const userType = CleanHTMLData(CleanDBData(postData.usertype));
          const userId = CleanHTMLData(CleanDBData(postData.userid));
    
          let userCondition;
          if (userType === "sender") {
            userCondition = `And t.senderid = ${userId}`;
          } else {
            userCondition = `And t.receiverid = ${userId}`;
          }
    
          let statuscondition = "";
          if (status !== "all") {
            statuscondition = `AND t.status = '${status}'`;
          }
    
          const selectTransactionsQuery = `SELECT t.*, u1.username as senderusername, u2.username as receiverusername from 
          transaction t 
        LEFT JOIN usersdata u1 ON t.senderid = u1.id 
        LEFT JOIN usersdata u2 ON t.receiverid = u2.id 
        WHERE t.type <> 'payout' ${statuscondition} ${userCondition}
        and
        t.createdat >= DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 7 DAY) + INTERVAL 0 SECOND
        AND t.createdat < DATE_SUB(DATE(NOW()), INTERVAL WEEKDAY(NOW()) + 1 DAY) + INTERVAL 86399 SECOND
        `;
          const selectTransactionsResult = await Qry(selectTransactionsQuery, [
            type,
          ]);
    
          res.status(200).json({
            status: "success",
            data: selectTransactionsResult,
          });
        }
      } catch (e) {
        console.log(e);
        res.status(500).json({ status: "error", message: e.message });
      }
    });

module.exports = router;
