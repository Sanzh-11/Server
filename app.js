const process = require('node:process')

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.serialize(() => {
  db.run(`
      CREATE TABLE IF NOT EXISTS clients (
          IIN TEXT PRIMARY KEY,
          name TEXT,
          surname TEXT,
          contacts TEXT,
          date DATETIME,
          time INT
      )
  `);      
});

const app = express();
app.use(cors())
app.use(bodyParser.json({ type: 'application/json' }))

app.post('/book', (req, res) => {
  const { user, date, timeInterval } = req.body; 
  const { name, surname, IIN, contacts } = user;

  const selectRow = `SELECT * FROM clients WHERE IIN = ?`;

  db.get(selectRow, [IIN], (err, row) => {
    if (err) {
      console.error(err);
      res.sendStatus(400);
    } else {
      if (row) {
        const updateRow = `UPDATE clients SET date = ?, time = ? WHERE IIN = ?`;

        db.run(updateRow, [date, timeInterval, IIN], (updateErr) => {
          if (updateErr) {
            console.error(updateErr);
            res.sendStatus(400);
          } else {
            console.log(`User ${name} ${surname}'s date and time interval have been updated to ${date} in ${timeInterval}:00`);
            res.sendStatus(200);
          }
        });
      } else {
        const insertRow = `INSERT INTO clients (name, surname, IIN, contacts, date, time) VALUES (?, ?, ?, ?, ?, ?)`; 

        db.run(insertRow, [name, surname, IIN, contacts, date, timeInterval], (insertErr) => {
          if (insertErr) {
            console.error(insertErr);
            res.sendStatus(404);
          } else {
            console.log(`User ${name} ${surname} booked for ${date} in ${timeInterval}:00`);
            res.sendStatus(200);
          }
        });
      }
    }
  });
});


app.get('/check-iin', (req, res) => {
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

const formatDateValue = (dateValue) => dateValue >= 10 ? `${dateValue}` : `0${dateValue}`

app.get('/check-date', (req, res) => {
  const { date } = req.query;
  const dateObj = new Date(date);
  const formattedDate = `${dateObj.getFullYear()}-${formatDateValue(dateObj.getMonth() + 1)}-${formatDateValue(dateObj.getDate())}`
  const selectRows = `SELECT time FROM clients WHERE date(date) = date("${formattedDate}")`
  
  db.all(selectRows, [], (err, rows) => {
    if(err) {
      console.log(err);
      res.sendStatus(400);
    } else {
      const bookedTimes = rows.map((row) => row.time);
      console.log(bookedTimes);
      res.status(200);
      res.send(bookedTimes);
    }
  })
})

app.listen(3000, () => {
    console.log(`Example app listening on port 3000`)
})

process.on('exit', () => {
    db.close();
});