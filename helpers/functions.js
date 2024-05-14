const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database/connection')
const { DateTime } = require('luxon');
require('dotenv').config();

const secretKey = process.env.jwtSecretKey;

// Promisify the query function
const Qry = (sql, params) => {
  //const formattedQuery = db.format(sql, params); // Format the query with parameters
  ////console.log('Executing query:', formattedQuery); // Log the formatted query
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

//find available space in tree
async function findAvailableSpace(pid, leg) {
  try {
    const [rows] = await Qry(
      'SELECT `pid`, `userid` FROM `binarytree` WHERE `pid` = ? AND `leg` = ?',
      [pid, leg]
    );
    if (!rows || rows.length === 0) {
      return pid;
    }
    const nextID = await findAvailableSpace(rows.userid, leg);
    return nextID !== null ? nextID : null;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    return null;
  }
}

async function binaryCalculation(uplineUserIds, nairaprice,todayDate) {

  selectUpline = await Qry(`select bt.*, pd.daily_cap, pd.qualifying_points,pd.converted_points_percentage 
  from binarytree bt 
  left join usersdata ud on ud.id = bt.userid
  left join packages pd on pd.id = ud.pkgid
  where bt.userid IN (${uplineUserIds}) and bt.left_points >= pd.qualifying_points and bt.right_points >= pd.qualifying_points and ud.pkgid > 13`)
  await selectUpline.map(async (userData)=>{
    const binaryQualified = await Qry(`SELECT sponsorid
    FROM usersdata
    WHERE sponsorid = ? and (referral_side = 'L' OR referral_side = 'R') and status = 'approved'
    HAVING SUM(CASE WHEN referral_side = 'L' THEN 1 ELSE 0 END) >= 1
       AND SUM(CASE WHEN referral_side = 'R' THEN 1 ELSE 0 END) >= 1`,[userData?.userid])
    if(binaryQualified.length > 0)
    {
      
    const selectUserDailyPairingBonus = await Qry(`select COALESCE(SUM(amount), 0) as todaypairingbonus from transaction where receiverid = ? and type = ? and DATE(createdat) = CURDATE()`, [userData?.userid, 'pairingbonus']) 
    const bonusAmount =  (userData.qualifying_points*(userData.converted_points_percentage/100))*nairaprice
    const updatedLeftPoints = userData.left_points - userData.qualifying_points
    const updatedRightPoints = userData.right_points - userData.qualifying_points

    const todayTotalBonus = parseFloat(selectUserDailyPairingBonus[0]?.todaypairingbonus)+parseFloat(bonusAmount)

    if(todayTotalBonus <= userData.daily_cap)
    {
          await Qry(`insert into transaction ( receiverid, senderid, amount, type, details,createdat) values ( ? , ? , ? ,? , ?,?)`,[userData?.userid, 0,bonusAmount,'pairingbonus',`successfully received Matching Bonus of $${bonusAmount}`, todayDate])

          await Qry(`update usersdata set current_balance = current_balance + ? where id = ?`,[bonusAmount,userData?.userid])

          await Qry(`update binarytree set left_points = left_points - ?, right_points = right_points - ?, updatedat = ?,
          converted_points = converted_points + ? 
          where userid = ?`,[userData.qualifying_points, userData.qualifying_points, todayDate , userData.qualifying_points,userData?.userid])

          if(updatedLeftPoints < userData.qualifying_points || updatedRightPoints < userData.qualifying_points)
      {
        await Qry(`update pendingpairingbonus set status = ? where userid = ?`,['inactive',userData?.userid])
      }
    }else{
      const selectPending = await Qry(`select * from pendingpairingbonus where userid = ?`,[userData?.userid])
      if(selectPending.length > 0)
      {
        await Qry(`update pendingpairingbonus set status = ?, lastsent = ? where userid = ?`,['active',todayDate,userData?.userid])

      }else{
        await Qry(`insert into pendingpairingbonus(userid,lastsent) values (?,?)`,[userData?.userid,todayDate])

      }
      console.log('todayTotalBonus', todayTotalBonus, 'bonus user', userData?.userid, 'cap', userData.daily_cap)

    }
  }
  })
}


async function checkAuthorization(req, res) {
  // Check if the authorization header is present
  if (!req.headers.authorization) {
    res.status(401).json({ status: 'error', message: 'Authorization header is missing.' });
    return false;
  } else {
    const token = req.headers.authorization.split(' ')[1];
    return new Promise((resolve) => {
      jwt.verify(token, secretKey, async (err, user) => {
        if (err) {
          res.status(401).json({ status: 'error', message: 'token_expired' });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            const selectUser = await Qry(`SELECT * FROM usersdata WHERE username = '${user.username}'`);
            const userData = selectUser[0];

            if (userData && userData.username === user.username) {
              resolve(userData.id);
            } else {
              res.status(401).json({ status: 'error', message: 'Invalid User.' });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ status: 'error', message: 'Server error occurred' });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });
  }
}

async function authMiddleware(req, res) {
  // Check if the authorization header is present
  if (!req.headers.authorization) {
    return res.status(401).json({ status: 'error', message: 'Authorization header is missing.' });
    return false;
  } else {
    const token = req.headers.authorization.split(' ')[1];
    return new Promise((resolve) => {
      jwt.verify(token, secretKey, async (err, user) => {
        if (err) {
          return res.status(401).json({ status: 'error', message: 'token_expired' });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            const selectUser = await Qry(`SELECT * FROM usersdata WHERE username = '${user.username}'`);
            const userData = selectUser[0];

            if (userData && userData.username === user.username) {
             return next(userData);
            } else {
              return res.status(401).json({ status: 'error', message: 'Invalid User.' });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            console.error('Error executing query:', error);
            return res.status(500).json({ status: 'error', message: 'Server error occurred' });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });
  }
}


async function adminAuthorization(req, res) {
  // Check if the authorization header is present
  if (!req.headers.authorization) {
    res.status(401).json({ status: 'error', message: 'Authorization header is missing.' });
    return false;
  } else {
    const token = req.headers.authorization.split(' ')[1];
    return new Promise((resolve) => {
      jwt.verify(token, secretKey, async (err, user) => {
        if (err) {
          res.status(401).json({ status: 'error', message: 'token_expired' });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            const selectUser = await Qry(`SELECT * FROM usersdata WHERE username = '${user.username}'`);
            const userData = selectUser[0];

            if (userData && userData.username === user.username && userData.usertype === 'admin') {
              resolve(userData.id);
            } else {
              res.status(401).json({ status: 'error', message: 'Invalid admin User.' });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ status: 'error', message: 'Server error occurred' });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });
  }
}

async function manualLoginAuthorization(token, res) {


    return new Promise((resolve) => {
      jwt.verify(token, secretKey, async (err, user) => {
        if (err) {
          res.status(401).json({ status: 'error', message: 'token_expired' });
          resolve(false); // Use resolve instead of reject
        } else {
          try {
            const selectUser = await Qry(`SELECT * FROM usersdata WHERE username = '${user.username}'`);
            const userData = selectUser[0];

            const selectAdmin = await Qry(`SELECT * FROM usersdata WHERE id = '${user.createdby}' and usertype = 'admin'`);

            if (selectUser.length > 0  && selectAdmin.length > 0 ) {
              resolve(userData.id);
            } else {
              res.status(401).json({ status: 'error', message: 'Invalid User.' });
              resolve(false); // Use resolve instead of reject
            }
          } catch (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ status: 'error', message: 'Server error occurred' });
            resolve(false); // Use resolve instead of reject
          }
        }
      });
    });

}


function randomToken(length = 100) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ12345689';
  let myString = '';
  for (let i = 0; i < length; i++) {
    const pos = crypto.randomInt(0, chars.length - 1);
    myString += chars[pos];
  }
  return myString;
}

async function settings_data(keyname) {
  try {
    const settingSelectQuery = `SELECT * FROM setting WHERE keyname = ?`;
    const settingSelectResult = await Qry(settingSelectQuery, [keyname]);
    return settingSelectResult;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    return null;
  }
}

// Function to fetch users from the binary tree
async function getBinaryTreeUsers1(user) {
  const select = await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ?", [user]);
  return select;
}

async function getCurrentTime()
{
  // Get the current date and time in UTC
const currentUTC = DateTime.utc();
// Create a DateTime object for New York in the 'America/New_York' time zone
const newYorkTime = currentUTC.setZone('America/New_York');
// Format the New York time in the desired format

return newYorkTime.toFormat('yyyy-MM-dd HH:mm:ss');

}

async function getBinaryTreeUsers(user) {
  let select = []
  let users= []

  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [user]);
  users[0]=select[0]?.userid || '' 
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [user]);
  users[1]=select[0]?.userid
  
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [users[0]]);
  users[2]=select[0]?.userid
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [users[0]]);
  users[3]=select[0]?.userid
  
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [users[1]]);
  users[4]=select[0]?.userid
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [users[1]]);
  users[5]=select[0]?.userid
  
  
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [users[2]]);
  users[6]=select[0]?.userid
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [users[2]]);
  users[7]=select[0]?.userid
 
    
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [users[3]]);
  users[8]=select[0]?.userid
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [users[3]]);
  users[9]=select[0]?.userid
     
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [users[4]]);
  users[10]=select[0]?.userid
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [users[4]]);
  users[11]=select[0]?.userid
 

       
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [users[5]]);
  users[12]=select[0]?.userid
  select= await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [users[5]]);
  users[13]=select[0]?.userid
 

  // select[2] = select[0]?.userid ? await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [select[0][0].userid]) : null;
  // select[3] = select[0]?.userid ? await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [select[0][0].userid]) : null;
  
  // select[4] = select[1]?.userid ? await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'L'", [select[1][0].userid]) : null;
  // select[5] = select[1]?.userid ? await Qry("SELECT userid, pid FROM `binarytree` WHERE pid = ? and leg = 'R'", [select[1][0].userid]) : null;
  
  return users
}


// Function to fetch user data
async function getUserData(user) {

  if (!user) {
    return '';
  }

  const selectUser = await Qry(`SELECT ud.username, ud.sponsorid, ud.randomcode, ud.picture, ud.firstname, ud.lastname, bt.total_left_points, bt.total_right_points, bt.investment FROM usersdata ud 
  left join binarytree bt on bt.userid = ud.id
  WHERE ud.id = ?`, [user]);
  const user_data = selectUser[0];
  const userfullname = `${user_data.firstname} ${user_data.lastname}`;

  const selectSponsor = await Qry("SELECT username, sponsorid, firstname, lastname FROM usersdata WHERE id = ?", [user_data.sponsorid]);
  const sponsor_data = selectSponsor[0];
  let sponsorfullname,sponsorUsername
  if(selectSponsor.length > 0)
  {
    sponsorfullname = `${sponsor_data.firstname} ${sponsor_data.lastname}`;
    sponsorUsername = sponsor_data.username
  }
  else{
      sponsorUsername = 'admin';
      sponsorfullname = 'admin';
    }

  if (!user_data.username) {
    user_data.username = 'empty';
  }

  if (!user_data.picture) {
    user_data.picture = 'profile.png';
  }

  return `${user_data.username}*${sponsorUsername}*${user_data.randomcode}*${user_data.picture}*${userfullname}*${sponsorfullname}*${user_data.total_left_points}*${user_data.total_right_points}*${user_data.investment}`;
}


async function weiToEther(weiAmount, decimals) {
  const etherInWei = 10 ** decimals; // 1 Ether in Wei with the specified number of decimals
  // Perform the conversion
  const ethAmount = weiAmount / etherInWei;
  return ethAmount;
}

module.exports = {
  checkAuthorization,
  adminAuthorization,
  authMiddleware,
  randomToken,
  findAvailableSpace,
  Qry,
  settings_data,
  getBinaryTreeUsers,
  getUserData,
  manualLoginAuthorization,
  binaryCalculation,
  weiToEther,
  getBinaryTreeUsers1,
  getCurrentTime
};