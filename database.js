const sqlite3 = require("sqlite3").verbose();
const dbName = "myDatabase.db";

let db = new sqlite3.Database(dbName, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to the Database");
    db.run(
      "CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password_hash TEXT)",
      (err) => {
        if (err) {
          console.error(err.message);
        } else {
          console.log("Table Created or Existed");
        }
      }
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS Tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, status TEXT, assignee_id INTEGER, created_at DATETIME, updated_at DATETIME, FOREIGN KEY(assignee_id) REFERENCES Users(id))",
      (err) => {
        if (err) {
          console.error(err.message);
        } else {
          console.log("Table Created or Existed");
        }
      }
    );
  }
});

module.exports = db;
