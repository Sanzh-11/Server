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
            date DATETIME
        )
    `);      
});

const app = express();
app.use(cors())
app.use(bodyParser.json({ type: 'application/json' }))

app.post('/book', (req, res) => {
    const { user, date } = req.body;
    const { name, surname, IIN, contacts } = user;
  
    const selectRow = `SELECT * FROM clients WHERE IIN = ?`;
  
    db.get(selectRow, [IIN], (err, row) => {
      if (err) {
        console.error(err);
        res.sendStatus(500);
      } else {
        if (row) {
          const updateRow = `UPDATE clients SET date = ? WHERE IIN = ?`;
  
          db.run(updateRow, [date, IIN], (updateErr) => {
            if (updateErr) {
              console.error(updateErr);
              res.sendStatus(500);
            } else {
              console.log(`User ${name} ${surname}'s date has been updated to ${date}`);
              res.sendStatus(200);
            }
          });
        } else {
          const insertRow = `INSERT INTO clients (name, surname, IIN, contacts, date) VALUES (?, ?, ?, ?, ?)`;
  
          db.run(insertRow, [name, surname, IIN, contacts, date], (insertErr) => {
            if (insertErr) {
              console.error(insertErr);
              res.sendStatus(500);
            } else {
              console.log(`User ${name} ${surname} booked for ${date}`);
              res.sendStatus(200);
            }
          });
        }
      }
    });
});  

app.get('/check-iin', (req, res) => {
    const { iin } = req.query;
    console.log(iin);
  
    const selectRow = `SELECT * FROM clients WHERE IIN = ?`;
  
    db.get(selectRow, [iin], (err, row) => {
      if (err) {
        console.error(err);
        res.sendStatus(500);
      } else {
        if (row) {
          const { name, surname, IIN, contacts, date } = row;
          const userInfo = { name, surname, IIN, contacts, date };
          res.status(200).json(userInfo);
        } 
      }
    });
});

app.listen(3000, () => {
    console.log(`Example app listening on port 3000`)
})

process.on('exit', () => {
    db.close();
});


