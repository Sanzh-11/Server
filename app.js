const process = require("node:process");

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

db.serialize(() => {
  db.run(`
      CREATE TABLE IF NOT EXISTS clients (
          IIN TEXT PRIMARY KEY,
          name TEXT,
          surname TEXT,
          contacts TEXT,
          date DATETIME,
          time INT,
          approved BOOLEAN,
          admin BOOLEAN, 
          email TEXT UNIQUE,
          filePath TEXT 
      )
  `);
});

const app = express();
app.use(cors());
app.use(bodyParser.json({ type: "application/json" }));
app.use(express.static("uploads"));

app.post("/book", (req, res) => {
  console.log(req.body);
  const { user, date, timeInterval } = req.body;
  const { name, surname, IIN, contacts, filePath } = user;

  const selectRow = `SELECT * FROM clients WHERE IIN = ?`;

  db.get(selectRow, [IIN], (err, row) => {
    if (err) {
      console.error(err);
      res.sendStatus(400);
    } else {
      if (row) {
        const updateRow = `UPDATE clients SET date = ?, time = ?, approved = false, filePath = ? WHERE IIN = ?`;

        db.run(updateRow, [date, timeInterval, filePath, IIN], (updateErr) => {
          if (updateErr) {
            console.error(updateErr);
            res.sendStatus(400);
          } else {
            console.log(
              `User ${name} ${surname}'s date and time interval have been updated to ${date} in ${timeInterval}:00`
            );
            res.sendStatus(200);
          }
        });
      } else {
        const insertRow = `INSERT INTO clients (name, surname, IIN, contacts, date, time, approved, filePath) VALUES (?, ?, ?, ?, ?, ?, false, ?)`;

        db.run(
          insertRow,
          [name, surname, IIN, contacts, date, timeInterval, filePath],
          (insertErr) => {
            if (insertErr) {
              console.error(insertErr);
              res.sendStatus(404);
            } else {
              console.log(
                `User ${name} ${surname} booked for ${date} in ${timeInterval}:00`
              );
              res.sendStatus(200);
            }
          }
        );
      }
    }
  });
});

app.post("/book-file", upload.single("file"), (req, res) => {
  console.log(req.body, req.file);
  const { user, date, timeInterval } = req.body;
  const { name, surname, IIN, contacts, filePath } = user;

  const selectRow = `SELECT * FROM clients WHERE IIN = ?`;
  res.json({
    filePath: `http://localhost:3000/${req.file.filename}`,
    message: "File uploaded successfully!",
  });

  db.get(selectRow, [IIN], (err, row) => {
    if (err) {
      console.error(err);
      res.sendStatus(400);
    } else {
      if (row) {
        const updateRow = `UPDATE clients SET date = ?, time = ?, approved = false, filePath = ? WHERE IIN = ?`;

        db.run(updateRow, [date, timeInterval, filePath, IIN], (updateErr) => {
          if (updateErr) {
            console.error(updateErr);
            res.sendStatus(400);
          } else {
            console.log(
              `User ${name} ${surname}'s date and time interval have been updated to ${date} in ${timeInterval}:00`
            );
            res.sendStatus(200);
          }
        });
      } else {
        const insertRow = `INSERT INTO clients (name, surname, IIN, contacts, date, time, approved, filePath) VALUES (?, ?, ?, ?, ?, ?, false, ?)`;

        db.run(
          insertRow,
          [name, surname, IIN, contacts, date, timeInterval, filePath],
          (insertErr) => {
            if (insertErr) {
              console.error(insertErr);
              res.sendStatus(404);
            } else {
              console.log(
                `User ${name} ${surname} booked for ${date} in ${timeInterval}:00`
              );
              res.sendStatus(200);
            }
          }
        );
      }
    }
  });
});

app.get("/all-bookings", (req, res) => {
  const selectRow = `SELECT * FROM clients WHERE approved = true`;
  const arr = [];

  db.all(selectRow, (err, rows) => {
    if (err || !rows) {
      console.error(err);
      res.send(404);
    } else {
      rows.map((row) => {
        const { name, surname, IIN, contacts, date, admin, email, approved } =
          row;
        const userInfo = {
          name,
          surname,
          IIN,
          contacts,
          date,
          admin,
          email,
          approved,
        };
        arr.push(userInfo);
      });
      res.status(200);
      res.send(arr);
    }
  });
});

app.get("/check-iin", (req, res) => {
  const { iin } = req.query;

  const selectRow = `SELECT * FROM clients WHERE IIN = ?`;

  db.get(selectRow, [iin], (err, row) => {
    if (err || !row) {
      console.error(err);
      res.send(404);
    } else {
      const { name, surname, IIN, contacts, date } = row;
      const userInfo = { name, surname, IIN, contacts, date };
      res.status(200);
      res.send(userInfo);
    }
  });
});

const formatDateValue = (dateValue) =>
  dateValue >= 10 ? `${dateValue}` : `0${dateValue}`;

app.get("/check-date", (req, res) => {
  const { date } = req.query;
  const dateObj = new Date(date);
  const formattedDate = `${dateObj.getFullYear()}-${formatDateValue(
    dateObj.getMonth() + 1
  )}-${formatDateValue(dateObj.getDate())}`;
  const selectRows = `SELECT time FROM clients WHERE date(date) = date("${formattedDate}")`;

  db.all(selectRows, [], (err, rows) => {
    if (err) {
      console.log(err);
      res.sendStatus(400);
    } else {
      const bookedTimes = rows.map((row) => row.time);
      console.log(bookedTimes);
      res.status(200);
      res.send(bookedTimes);
    }
  });
});

app.get("/pending-bookings", (req, res) => {
  const selectRow = `SELECT * FROM clients WHERE approved = false`;
  const arr = [];

  db.all(selectRow, (err, rows) => {
    if (err || !rows) {
      console.error(err);
      res.send(404);
    } else {
      rows.map((row) => {
        const { name, surname, IIN, contacts, date, filePath } = row;
        const userInfo = { name, surname, IIN, contacts, date, filePath };
        arr.push(userInfo);
      });
      res.status(200);
      res.send(arr);
    }
  });
});

app.post("/approve-pending-booking", (req, res) => {
  const updateRow = `UPDATE clients SET approved = true WHERE IIN = ?`;
  console.log(req.body.id);
  db.run(updateRow, [req.body.id], (insertErr) => {
    if (insertErr) {
      console.error(insertErr);
      res.sendStatus(404);
    } else {
      console.log(`Approved booking for IIN = ${req.body.id}`);
      res.sendStatus(200);
    }
  });
});

app.get("/check-by-email", (req, res) => {
  const selectAdmin = `SELECT admin FROM clients WHERE email = ?`;
  console.log(req.query);

  db.get(selectAdmin, [req.query.email], (err, row) => {
    if (err || !row) {
      console.error(err);
      res.send(404);
    } else {
      res.status(200);
      res.send(row);
    }
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    filePath: `http://localhost:3000/${req.file.filename}`,
    message: "File uploaded successfully!",
  });
  console.log(req.file);
});

app.get("/add-column", (req, res) => {
  db.run(
    `UPDATE clients SET filePath = "http://localhost:3000/IMG_3129.jpg"`,
    (error) => {
      if (error) {
        console.log(error);
        res.sendStatus(500);
      } else {
        console.log("success");
        res.sendStatus(200);
      }
    }
  );
});

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`);
});

process.on("exit", () => {
  db.close();
});
