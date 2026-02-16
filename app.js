var express = require('express'); 
var app = express(); 
const bcrypt = require('bcrypt');
var session = require('express-session');
var conn = require ('./dbConfig');
const { error } = require('console');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const { get } = require('http');
const cors = require('cors');
const { title } = require('process');
app.use(cors()); // Allow cross-origin requests

// use this two lines for insert subscription data from gallery page 
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());

app.use(cors());


app.set('view engine','ejs'); 

//login session time setup 
app.use(session({
    secret: 'yoursecret',
    resave: true,
    saveUninitialized: true,
    rolling: true,
    cookie: {
        maxAge: 2 * 60 * 1000
    }
}));


//---------------------------------------------------------------------------Gallery page--------------------------------------------------------------------//

app.use(cors());
// Multer setup (store file in memory)

const upload = multer({ storage: multer.memoryStorage() });


//multer setup 
//const multer = require('multer'); 
//change for career page 
//const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, 'uploads/'), filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname) }); 
//const upload = multer({ storage });

// Upload route

app.post('/editgallery', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const imgtitle = req.body.imgtitle;
    const name = req.file.originalname;
    const imageData = req.file.buffer;

    conn.query('INSERT INTO images (imgtitle, name, image) VALUES (?, ?, ?)', [imgtitle, name, imageData], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error.');
        }
        res.send('Image uploaded and saved to MySQL!');
    });
});

// Retrieve images route
app.get('/images', upload.single('image'), (req, res) => {
    conn.query('SELECT id, imgtitle, name, image FROM images', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error.');
        }

        // Convert binary data to Base64 for display in browser
        const images = results.map(row => ({
            id: row.id,
            imgtitle: row.imgtitle,
            image: `data:image/jpeg;base64,${row.image.toString('base64')}`
        }));

        res.json(images);
    });
});

//app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));


//Delete image by ID
app.delete('/images/:id', upload.single('image'), (req, res) => {
 const imageId = req.params.id;
 conn.query("DELETE FROM images WHERE id = ?", [imageId], (err, result) =>
{
 if (err) {
 console.error(err);
 return res.status(500).send('Database error.');
 }
 if (result.affectedRows === 0) {
 return res.status(404).send('Image not found.');
 }
 res.send('Image deleted successfully!');
 });
});

//Insert subscription data in gallery page 
app.post('/gallery', function(req, res) {

    const { name, email } = req.body; 
    const sql = `INSERT INTO subscription (name, email) VALUES (?, ?)`; 
    conn.query(sql, [name, email], function(err) { if (err) { 
    console.error(err); return res.status(500).send("Database error"); } 
    console.log("record inserted"); res.render("gallery"); 
}); });

//------------------------------------------------------------------------End Gallery page-----------------------------------------------//

app.use('/public', express.static('public')); 

app.use(express.json());
app.use(express.urlencoded({ extended: true}));



app.get('/', function (req, res){
    res.render("home"); 
}); 

//--------------------------------------------------------------Sample code -------------------------------------------------------//
//Users can access this if they are logged in
app.get('/membersOnly', function (req,res, next){
    if (req.session.loggedin){
        res.render('membersOnly');
    }
    else {
        res.send('Please login to view this page!');
    }
});

//Users can access this only if they are logged in
app.get('/addMPs', function (req, res, next){
    if (req.session.loggedin)
    {
        res.render('addMPs');

    }
    else 
    {
        res.send('Please login to view this page');
    }
});

//--------------------------------------------------------------Sample code -------------------------------------------------------//

//--------------------------------------------------------------Admin registration and login page---------------------------------------------//
//input admin details //
app.post('/adminRegister', async function(req, res, next) {
    try {
        const adminName = req.body.adminName;
        const email = req.body.email;
        const userName = req.body.userName;
        const password = req.body.password;

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO adminRegister (adminName, email, userName, password, status, role)
            VALUES (?, ?, ?, ?, 'pending', 'normal')
        `;

        conn.query(sql, [adminName, email, userName, hashedPassword], function(err, result) {
            if (err) throw err;

            console.log('Admin registered with encrypted password');

            res.render('adminLogin', { 
                error: "Registration submitted. Waiting for head admin approval.",
                success: false 
            });
        });

    } catch (err) {
        console.error(err);
        res.render('adminLogin', { error: "Something went wrong.", success: false });
    }
});




//user authentiation page 
app.get("/adminPage", (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/adminLogin");
    }

    res.render("adminPage", { admin: req.session.admin });
});


//Middleware
function isAdminLoggedIn(req, res, next) {
    if (req.session && req.session.loggedin) {
        next();
    } else {
        res.redirect('/adminLogin?msg=loginRequired');
    }
}

function isHeadAdmin(req, res, next) {
    if (req.session.admin && req.session.admin.role === "head") {
        return next();
    }
    return res.redirect("/adminPage");
}


/*Login page */ 
app.get('/adminLogin', (req, res) => {
    res.render("adminLogin", { error: null, success: null });
});

app.post('/adminLogin', function(req, res) {
    let userName = req.body.username;
    let password = req.body.password;
    console.log("Login attempt:", userName, password);


    conn.query(
        'SELECT * FROM adminRegister WHERE userName = ?',
        [userName],
        async function(error, results) {
            if (error) throw error;

            if (results.length === 0) {
                return res.render('adminLogin', { 
                    error: 'Incorrect username or password!',
                    success: false
                });
            }

            const admin = results[0];

            // 🔐 Compare hashed password
            const match = await bcrypt.compare(password, admin.password);
            
            console.log("DB password:", admin.password);
            console.log("Compare result:", match);



            if (!match) {
                return res.render('adminLogin', { 
                    error: 'Incorrect username or password!',
                    success: false
                });
            }

            // ❗ Check approval status
            if (admin.status !== "approved") {
                return res.render('adminLogin', { 
                    error: "Your admin access is pending head admin approval.",
                    success: false
                });
            }

            // Store session data
            req.session.admin = {
                id: admin.id,
                userName: admin.userName,
                role: admin.role,
                status: admin.status
            };
            req.session.loggedin = true;


            console.log("Logged in admin:", req.session.admin);

            // 🔔 Show popup only once after approval
            if (admin.justApproved === 1) {
                req.session.justApproved = true;

                conn.query(
                    "UPDATE adminRegister SET justApproved = 0 WHERE id = ?",
                    [admin.id]
                );
            }

            res.redirect('/adminPage');
        }
    );
});



/*Head admin page: list pending admins*/
app.get("/admin/pending", isHeadAdmin, (req, res) => {
    conn.query("SELECT * FROM adminRegister WHERE status = 'pending'", (err, rows) => {
        if (err) throw err;
        res.render("approval.ejs", { 
            admins: rows,
            admin: req.session.admin
        });
    });
});




// APPROVE
app.post('/admin/approve/:id', isHeadAdmin, (req, res) => {
    const id = req.params.id;
    conn.query("UPDATE adminRegister SET status='approved' WHERE id=?", [id], err => {
        if (err) throw err;
        res.redirect('/admin/pending');
    });
});

// REJECT (moves to rejected state)
app.post('/admin/reject/:id', isHeadAdmin, (req, res) => {
    const id = req.params.id;
    conn.query("UPDATE adminRegister SET status='rejected' WHERE id=?", [id], err => {
        if (err) throw err;
        res.redirect('/admin/pending');
    });
});

// DELETE (permanent removal)
app.post('/admin/delete/:id', isHeadAdmin, (req, res) => {
    const id = req.params.id;
    conn.query("DELETE FROM adminRegister WHERE id=?", [id], err => {
        if (err) throw err;
        res.redirect('/admin/pending');
    });
});



// logout authentiation 
app.get('/adminLogout', function(req, res) {
    req.session.destroy(() => {
        res.redirect('/adminLogin');
    });
});

//Backend route to send recovery email
const crypto = require("crypto");
const nodemailer = require("nodemailer");

app.post("/forgotPass", (req, res) => {
    const email = req.body.email;

    conn.query("SELECT * FROM adminRegister WHERE email=?", [email], (err, result) => {
        if (err) throw err;

        if (result.length === 0) {
            return res.send("No account found with that email.");
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

        conn.query(
            "UPDATE adminRegister SET resetToken=?, resetTokenExpiry=? WHERE email=?",
            [token, expiry, email]
        );

        const resetLink = `http://localhost:3000/reset-password/${token}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "yourgmail@gmail.com",
                pass: "your-app-password"
            }
        });

        const mailOptions = {
            from: "yourgmail@gmail.com",
            to: email,
            subject: "Admin Account Recovery",
            text: `Click the link to reset your password: ${resetLink}`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                return res.send("Error sending email.");
            }
            res.send("Recovery email sent. Check your inbox.");
        });
    });
});
//Backend route to handle reset
app.get("/reset-password/:token", (req, res) => {
    const token = req.params.token;

    conn.query(
        "SELECT * FROM adminRegister WHERE resetToken=? AND resetTokenExpiry > NOW()",
        [token],
        (err, result) => {
            if (err) throw err;

            if (result.length === 0) {
                return res.send("Invalid or expired token.");
            }

            res.render("reset-password", { token });
        }
    );
});

app.post("/reset-password/:token", (req, res) => {
    const token = req.params.token;
    const newPassword = req.body.password;

    const hashed = bcrypt.hashSync(newPassword, 10);

    conn.query(
        "UPDATE adminRegister SET password=?, resetToken=NULL, resetTokenExpiry=NULL WHERE resetToken=?",
        [hashed, token],
        (err) => {
            if (err) throw err;
            res.send("Password reset successful. You can now log in.");
        }
    );
});

//Forgot username route 
app.post("/forgotUsername", (req, res) => {
    const email = req.body.email;

    conn.query("SELECT userName FROM adminRegister WHERE email=?", [email], (err, result) => {
        if (err) throw err;

        if (result.length === 0) {
            return res.send("No account found with that email.");
        }

        const username = result[0].userName;

        transporter.sendMail({
            from: "yourgmail@gmail.com",
            to: email,
            subject: "Your Admin Username",
            text: `Your username is: ${username}`
        });

        res.send("Username sent to your email.");
    });
});


//-----------------------------------------------------------------End Admin registration and login page-------------------------------//


//-----------------------------------------------------------------Contactus ----------------------------------------------------------//
//input contactUs details 
app.post('/contactUs', function(req, res) {
  const { name, email, phone, date, time, subject, message } = req.body;

  const sql = `
    INSERT INTO contactUs (name, email, phone, date,time, subject, message)
    VALUES (?, ?, ?, ?, ?, ?, ? )
  `;

  conn.query(sql, [name, email, phone, date, time, subject, message], function(err, result) {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: "Message sending failed" });
    }

    console.log("Contact message inserted!");

    res.json({
      success: true,
      message: "Thank you! Your message has been sent successfully."
    });
  });
});


//display contactus data in admin page
// API endpoint to fetch data
app.get('/data6', (req, res) => {
    const searchDate = req.query.date;
    const range = req.query.range;

    let sql = `
        SELECT name, email, phone, subject, message, date, time
        FROM contactus
        WHERE 1=1
    `;
    let params = [];

    // Search by specific date
    if (searchDate) {
        sql += " AND date = ?";
        params.push(searchDate);
    }

    // Today filter
    if (range === "today") {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;

        sql += " AND date = ?";
        params.push(today);
    }

    // This Week filter
    if (range === "week") {
        const now = new Date();
        const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const day = local.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;

        const monday = new Date(local);
        monday.setDate(local.getDate() + diffToMonday);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

        sql += " AND date BETWEEN ? AND ?";
        params.push(start, end);
    }

    sql += " ORDER BY date DESC, time DESC";

    conn.query(sql, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results);
    });
});



// insert subscription data in contactus page 
app.post('/contact2', (req, res) => { 
    const { name, email } = req.body; 
    const sql = `INSERT INTO subscription (name, email) VALUES (?, ?)`; 
    conn.query(sql, [name, email], (err) => { 
        if (err) throw err; console.log('Subscription inserted!'); res.render('contactUs');
     });
 });

//--------------------------------------------------------------------------End contact us page ----------------------------------------//

// insert subscription data from home page 
app.post('/' , function(req, res, next){
    var name = req.body.name;
    var email = req.body.email;
    var sql = `INSERT INTO subscription (name, email) VALUES ("${name}", "${email}")`;
        conn.query(sql, function (err, result){
            if (err) throw err;
            console.log('record inserted');
            res.render('home');
        });
});




//-----------------------------------------------------------Menu page---------------------------------------------------------------//

//insert menu data
app.post('/insertMenu', function(req, res, next) {
    var catagory = req.body.catagory;
    var dishName = req.body.dishName;
    var description = req.body.description;
    var price = req.body.price;

    var sql = `INSERT INTO addMenu1 (catagory, dishName, description, price) VALUES (?, ?, ?, ?)`;

    conn.query(sql, [catagory, dishName, description, price], function(err, result) {
        if (err) throw err;

        console.log('record inserted');
        res.redirect('/insertMenu?success=1');

    });
});

//delete menuitems 
app.delete('/deleteMenu/:id', (req, res) => {
    const id = req.params.id;

    const sql = "DELETE FROM addmenu1 WHERE dishID = ?";
    conn.query(sql, [id], (err, result) => {
        if (err) throw err;

        res.json({ message: "Menu item deleted successfully!" });
    });
});
//EDIT MENU ITEM
app.put('/updateMenu/:dishID', (req, res) => {
    const id = req.params.dishID;
    const { dishName, description, price } = req.body;

    const sql = `
        UPDATE addmenu1 
        SET dishName = ?, description = ?, price = ?
        WHERE dishID = ?
    `;

    conn.query(sql, [dishName, description, price, id], (err, result) => {
        if (err) throw err;

        res.json({ message: "Menu item updated successfully!" });
    });
});

//Insert subscription in menu page 
app.post('/menu' , function(req, res, next){
    //var dishID = req.body.dishID;
    var name = req.body.name;
    var email = req.body.email;
    var sql = `INSERT INTO subscription (name,email) VALUES ("${name}", "${email}")`;
        conn.query(sql, function (err, result){
            if (err) throw err;
            console.log('record inserted');
            res.render('menu');
        });
});
//display menu data
// API endpoint to fetch data
app.get('/data', (req, res) => {
    conn.query('SELECT * FROM addmenu1 where catagory = "breakfast"', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results); // Send data as JSON
    });
});
app.get('/data1', (req, res) => {
    conn.query('SELECT * FROM addmenu1 where catagory = "lunch"', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results); // Send data as JSON
    });
});
app.get('/data2', (req, res) => {
    conn.query('SELECT * FROM addmenu1 where catagory = "Dinner"', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results); // Send data as JSON
    });
});
app.get('/data3', (req, res) => {
    conn.query('SELECT * FROM addmenu1 where catagory = "Beverage"', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results); // Send data as JSON
    });
});

//insert menu data
app.post('/insertMenu' , function(req, res, next){
    //var dishID = req.body.dishID;
    var catagory = req.body.catagory;
    var dishName = req.body.dishName;
    var description = req.body.description;
    var price = req.body.price;
    var sql = `INSERT INTO addMenu1 (catagory, dishName, description, price) VALUES ("${catagory}", "${dishName}","${description}","${price}")`;
        conn.query(sql, function (err, result){
            if (err) throw err;
            console.log('record inserted');
            res.render('insertMenu');
        });
});
//----------------------------------------------------------------End Menu page-------------------------------------------------//




//----------------------------------------------------------------Booking page ---------------------------------------------------//

//display booking data in admin page
// API endpoint to fetch data
app.get('/data4', (req, res) => {
    const searchDate = req.query.date;
    const range = req.query.range;

    let sql = `
        SELECT fName, lName, email, phone, date, time, event, number, comment
        FROM booking
        WHERE 1=1
    `;
    let params = [];

    // Search by specific date (exact match, no timezone conversion)
    if (searchDate) {
        sql += " AND date = ?";
        params.push(searchDate);
    }

    // TODAY filter (manual YYYY-MM-DD, no timezone)
    if (range === "today") {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;

        sql += " AND date = ?";
        params.push(today);
    }

    // THIS WEEK filter (manual date math, no timezone)
    if (range === "week") {
        const now = new Date();
        const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const day = local.getDay(); // 0 = Sunday
        const diffToMonday = day === 0 ? -6 : 1 - day;

        const monday = new Date(local);
        monday.setDate(local.getDate() + diffToMonday);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

        sql += " AND date BETWEEN ? AND ?";
        params.push(start, end);
    }

    sql += " ORDER BY date ASC, time ASC";

    conn.query(sql, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results);
    });
});





//insert booking information 

        
app.post('/booking', (req, res) => {
  const { fName, lName, email, phone, date, time, event, number, comment } = req.body;

  const sql = `
    INSERT INTO booking (fName, lName, email, phone, date, time, event, number, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(sql, [fName, lName, email, phone, date, time, event, number, comment], (err) => {
    if (err) {
      return res.json({ success: false, message: "Booking failed" });
    }

    console.log("Booking inserted!");

    res.json({
      success: true,
      message: "Your booking has been confirmed!"
    });
  });
});

//Insert subscription in booking page 
app.post('/signup', (req, res) => {
    const { name, email } = req.body;
    const sql = `INSERT INTO subscription (name, email) VALUES (?, ?)`;

    conn.query(sql, [name, email], (err) => {
        if (err) throw err;

        console.log('Subscription inserted!');
        res.render('booking', { success: true });
    });
});

//---------------------------------------------------------------------End Booking page -------------------------------------------------//
//---------------------------------------------------------------------Feedback page ----------------------------------------------------//
//display feedback data in admin page
// API endpoint to fetch data
app.get('/data5', (req, res) => {
    const searchDate = req.query.date;
    const range = req.query.range;

    let sql = `
        SELECT Name, email, phone, date, time, quality, service, experience, comment
        FROM feedback
        WHERE 1=1
    `;
    let params = [];

    // Search by specific date
    if (searchDate) {
        sql += " AND date = ?";
        params.push(searchDate);
    }

    // Today filter
    if (range === "today") {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;

        sql += " AND date = ?";
        params.push(today);
    }

    // This Week filter
    if (range === "week") {
        const now = new Date();
        const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const day = local.getDay(); // 0 = Sunday
        const diffToMonday = day === 0 ? -6 : 1 - day;

        const monday = new Date(local);
        monday.setDate(local.getDate() + diffToMonday);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

        sql += " AND date BETWEEN ? AND ?";
        params.push(start, end);
    }

    sql += " ORDER BY date DESC, time DESC";

    conn.query(sql, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results);
    });
});



//display job application data in admin page
// API endpoint to fetch data
app.get('/data8', (req, res) => {
    conn.query('SELECT name,email,cv_file,cover_file FROM applications', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results); // Send data as JSON
    });
});

//get subscription data 
app.get('/data9', (req, res) => {
    conn.query('SELECT name,email from subscription', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results); // Send data as JSON
    });
});


//insert feedback information 
app.post('/feedback', function(req, res) {
  const { Name, email, phone, date, time, quality, service, experience, comment } = req.body;

  const sql = `
    INSERT INTO feedback 
    (Name, email, phone, date, time, quality, service, experience, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(
    sql,
    [Name, email, phone, date, time, quality, service, experience, comment],
    function(err, result) {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: "Feedback submission failed" });
      }

      console.log("Feedback inserted!");

      res.json({
        success: true,
        message: "Thank you! Your feedback has been submitted."
      });
    }
  );
});

//insert subscription data in feedback page 
app.post('/feedback2', (req, res) => { 
    const { name, email } = req.body; 
    const sql = `INSERT INTO subscription (name, email) VALUES (?, ?)`; 
    conn.query(sql, [name, email], (err) => { 
        if (err) throw err; console.log('Subscription inserted!'); res.render('feedback');
     });
 });

//-------------------------------------------------------------------------------------End feedback page ------------------------------------------------//

//-------------------------------------------------------------------------------------Career page -----------------------------------------------------//

//insert career data 
// Upload route
app.post('/career1', upload.fields([{ name: 'cv', maxCount: 1 },{ name: 'coverLetter', maxCount: 1 }]), (req, res) => {
                console.log("📂 Files received:", req.files);
                console.log("📄 Body received:", req.body);
                        if (!req.files || !req.files.cv || !req.files.coverLetter) {
                        return res.status(400).json('❌ Both CV and Cover Letter are required.');
                        }

                            const { name, email } = req.body;
                            const cvFile = req.files.cv[0];
                            const coverFile = req.files.coverLetter[0];
                            const sql = ` INSERT INTO applications  (name, email, cv_filename, cv_file, cover_filename, cover_file)  VALUES (?, ?, ?, ?, ?, ?) `;
                            conn.query(sql, [ name, email, cvFile.originalname, cvFile.buffer, coverFile.originalname, coverFile.buffer ], (err) => {
                                    if (err) {
                                    console.error("❌ MySQL Error:", err);
                                    return res.status(500).json('Database error: ' + err.message);
                                    }
                                    //res.json('✅ Application submitted and files stored in database!');
                                    res.json({ success: true });
 });
});



//Insert subscription in career page 
app.post('/career2', (req, res) => { 
    const { name, email } = req.body; 
    const sql = `INSERT INTO subscription (name, email) VALUES (?, ?)`; 
    conn.query(sql, [name, email], (err) => { 
        if (err) throw err; console.log('Subscription inserted!'); res.render('career1');
     });
 });


 //sample for job application display
// List all applicants
app.get('/list', (req, res) => {
    conn.query("SELECT id, name, email, submitted_at FROM applications ORDER BY submitted_at DESC", (err, results) => {
        if (err) throw err;

       let html = `
        <h2>Applicants List</h2>
        <table border="1" cellpadding="8">
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Submitted At</th>
                <th>CV</th>
                <th>Cover Letter</th>
            </tr>
        `;

        results.forEach(row => {
            html += `
            <tr>
                <td>${row.id}</td>
                <td>${row.name}</td>
                <td>${row.email}</td>
                <td>${row.submitted_at}</td>
                <td><a href="/download/cv/${row.id}">Download CV</a></td>
                <td><a href="/download/cover/${row.id}">Download Cover Letter</a></td>
            </tr>
            `;
        });

        html += `</table><br><a href="/adminPage";>⬅ Back to adminPage</a>`;
        res.send(html);
    });
});

// Download CV
app.get('/download/cv/:id', (req, res) => {
    conn.query("SELECT cv_filename, cv_file FROM applications WHERE id = ?", [req.params.id], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.status(404).send('Not found');

        res.setHeader('Content-Disposition', `attachment; filename="${results[0].cv_filename}"`);
        res.send(results[0].cv_file);
    });
});

// Download Cover Letter
app.get('/download/cover/:id', (req, res) => {
    conn.query("SELECT cover_filename, cover_file FROM applications WHERE id = ?", [req.params.id], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.status(404).send('Not found');

        res.setHeader('Content-Disposition', `attachment; filename="${results[0].cover_filename}"`);
        res.send(results[0].cover_file);
    });
});
app.get('/list', function (req, res){
    res.render("list"); 
});

//----------------------------------------------------------------------------------------End career page-----------------------------------------------//

//---------------------------------------------------------------------------------------Online order page----------------------------------------------//

//online order data input
// API endpoint to fetch countries
app.get('/addmenu', (req, res) => {
    const sql = 'SELECT dishID,dishName FROM addmenu ORDER BY dishName ASC';
    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results);
    });
});

//Insert subscription data in onlineorder page page 
app.post('/onlineOrder' , function(req, res, next){
    //var dishID = req.body.dishID;
    var name = req.body.name;
    var email = req.body.email;
    var sql = `INSERT INTO subscription (name,email) VALUES ("${name}", "${email}")`;
        conn.query(sql, function (err, result){
            if (err) throw err;
            console.log('record inserted');
            res.render('onlineOrder');
        });
});


//display online order list in adminpage 
app.get("/get-orders", (req, res) => {
  const searchDate = req.query.date;
  const range = req.query.range;

  let sql = `
    SELECT customer_name, customer_phone, dishName, price, order_date, order_time, date AS pickup_date, time AS pickup_time, comment
    FROM orders
    WHERE 1=1
  `;
  let params = []; //create an empty array

  // Search by specific order date
  if (searchDate) {
    sql += " AND order_date = ?";
    params.push(searchDate);
  }

  // Today filter
  if (range === "today") {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");   //Converts the number into a string so we can format it.
    const dd = String(now.getDate()).padStart(2, "0");   //This ensures the string is always 2 characters long.
    const today = `${yyyy}-${mm}-${dd}`;

    sql += " AND order_date = ?";
    params.push(today);  //This adds the value of  into the  array.
  }

  // This Week filter
  if (range === "week") {
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const day = local.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(local);
    monday.setDate(local.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    const end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;

    sql += " AND order_date BETWEEN ? AND ?";
    params.push(start, end);
  }

  sql += " ORDER BY customer_phone, order_date DESC";

  conn.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

 // Get all menu data
app.post("/save-order", (req, res) => {
  const { customer_name, customer_phone, rows, date, time } = req.body;
  const comment = req.body.comment || "";
  // Validate customer info
  if (!customer_name || !customer_phone) {
    return res.status(400).json({ message: "Customer name and phone are required" });
  }

  // Validate pickup date/time
  if (!date || !time) {
    return res.status(400).json({ message: "Please select pickup date and time" });
  }

  // Validate order items
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: "Order list is empty" });
  }

  // Generate order placed date/time
  const now = new Date();
  const order_date = now.toISOString().split("T")[0];      // YYYY-MM-DD
  const order_time = now.toTimeString().split(" ")[0];     // HH:MM:SS

  // Build values for bulk insert
  const values = rows.map(r => [
    r.item_name,
    parseFloat(r.item_price) || 0, //converts the price to a number, and if it fails, it returns 0.
    customer_name,
    customer_phone,
    date,         // pickup date
    time,         // pickup time
    order_date,   // order placed date
    order_time,    // order placed time
    comment
  ]);

  const sql = `
    INSERT INTO orders 
    (dishName, price, customer_name, customer_phone, date, time, order_date, order_time, comment)
    VALUES ?
  `;

  conn.query(sql, [values], (err, result) => {
    if (err) {
      console.error("Insert error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json({
      message: "Thank you. Your order was placed successfully.",
      inserted: result.affectedRows
    });
  });
});


//------------------------------------------------------------------End online order page------------------------------------------------//

app.get('/auckland', function (req, res){
    res.render("auckland"); 
});
app.get('/', function (req, res){
    res.render(""); 
});


app.get('/uploadImage', function (req, res){
    res.render("uploadImage"); 
});
app.get('/displayImage', function (req, res){
    res.render("displayImage"); 
});

app.get('/beaches', function (req, res){
    res.render("beaches"); 
});

app.get('/booking', function (req, res){
    res.render("booking"); 
});

app.get('/feedback', function (req, res){
    res.render("feedback"); 
});
app.get('/contactUs', function (req, res){
    res.render("contactUs"); 
});
app.get('/career', function (req, res){
    res.render("career"); 
});
app.get('/career1', function (req, res){
    res.render("career1"); 
});
app.get('/adminLogin', function (req, res){
    res.render("adminLogin"); 
});

app.get('/adminLogin1', function (req, res){
    res.render("adminLogin1"); 
});
app.get('/adminRegister', function (req, res){
    res.render("adminRegister"); 
});
app.get('/forgotPass', function (req, res){
    res.render("forgotPass"); 
});
app.get('/admin', function (req, res){
    res.render("admin"); 
});
app.get('/addMenu', function (req, res){
    res.render("addMenu"); 
});
app.get('/insertMenu', function (req, res){
    res.render("insertMenu"); 
});
app.get('/logout' ,(req, res) =>{
    req.session.destroy();
    res.redirect('/');
});
app.get('/downloadImage' ,(req, res) =>{
    res.render('downloadImage');
});
app.get('/listMps' ,(req, res) =>{
    res.render('listMps');
});

app.get('/menu', function (req, res){
    res.render("menu"); 
});
app.get('/adminPage', function (req, res){
    res.render("adminPage"); 
});
app.get('/onlineOrder', function (req, res){
    res.render("onlineOrder"); 
});
app.get('/display', function (req, res){
    res.render("display"); 
});
app.get('/editgallery', function (req, res){
    res.render("editgallery"); 
});
app.get('/gallery', function (req, res){
    res.render("gallery"); 
});
app.get('/home', function (req, res){
    res.render("home"); 
});

app.get('/uploadjob', function (req, res){
    res.render("uploadjob"); 
});
app.get('/bookingList', function (req, res){
    res.render("bookingList"); 
});
app.get('/orderList', function (req, res){
    res.render("orderList"); 
});
app.get('/feedbackList', function (req, res){
    res.render("feedbackList"); 
});
app.get('/contactList', function (req, res){
    res.render("contactList"); 
});
    
app.get('/subscription', function (req, res){
    res.render("subscription"); 
});
app.get('/approval', function (req, res){
    res.render("approval"); 
});
//testing upload image



app.listen(3000); 
console.log('Node app is running on port 3000');