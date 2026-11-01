const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "books.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("DB Error:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS book (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      title  TEXT    NOT NULL,
      author TEXT    NOT NULL,
      price  INTEGER NOT NULL,
      pages  INTEGER NOT NULL
    )`,
    (err) => {
      if (err) {
        console.error("Table error:", err.message);
        return;
      }
      console.log("Table created (or already exists).");
    }
  );

  db.get("SELECT COUNT(*) AS count FROM book", (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }

    if (row.count === 0) {
      const books = [
        ["The Pragmatic Programmer",   "Andrew Hunt and David Thomas", 1200, 352],
        ["Clean Code",                 "Robert C. Martin",             950,  464],
        ["You Don't Know JS",          "Kyle Simpson",                 799,  278],
        ["Eloquent JavaScript",        "Marijn Haverbeke",             650,  472],
        ["JavaScript: The Good Parts", "Douglas Crockford",            599,  176],
        ["Node.js Design Patterns",    "Mario Casciaro",               1499, 660],
        ["Learning SQL",               "Alan Beaulieu",                799,  382],
        ["Database System Concepts",   "Abraham Silberschatz",         2200, 1376],
        ["Express in Action",          "Evan Hahn",                    1099, 256],
        ["RESTful Web API Patterns",   "Mike Amundsen",                1350, 312],
      ];

      const stmt = db.prepare(
        "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)"
      );
      books.forEach(([title, author, price, pages]) => {
        stmt.run(title, author, price, pages);
      });

      stmt.finalize(() => {
        console.log("Inserted 10 sample records.");

        db.all("SELECT * FROM book", [], (err, rows) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log("\n=== book table contents ===");
          rows.forEach((r) =>
            console.log(
              `ID:${r.id} | ${r.title} | ${r.author} | Rs.${r.price} | ${r.pages}pg`
            )
          );
          console.log("Total records:", rows.length);
          db.close(() => console.log("\nDatabase setup complete. books.db is ready."));
        });
      });
    } else {
      console.log("Records already present:", row.count);
      db.all("SELECT * FROM book", [], (err, rows) => {
        if (err) { console.error(err); db.close(); return; }
        console.log("\n=== book table contents ===");
        rows.forEach((r) =>
          console.log(
            `ID:${r.id} | ${r.title} | ${r.author} | Rs.${r.price} | ${r.pages}pg`
          )
        );
        db.close();
      });
    }
  });
});
