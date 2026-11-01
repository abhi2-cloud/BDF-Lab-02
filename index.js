/**
 * BDF Lab 2 – SQLite Database and CRUD Routes
 *
 * Student  : PAMPANA ABHI VEERA DURGA LAKSHMAN
 * Reg No   : 252U1R9115
 * Section  : CSE GEN AI 2B
 * Faculty  : Joel Prashanth D
 */

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(express.json());

// ──────────────────────────────────────────────
//  Database path (same directory as index.js)
// ──────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "books.db");

// ──────────────────────────────────────────────
//  PORT – use environment variable on Render,
//  fall back to 3000 for local development
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

let db; // shared database connection

// ──────────────────────────────────────────────
//  initializeDBAndServer
//  Opens the SQLite database, creates the book
//  table if it does not exist, inserts sample
//  data on first run, then starts the HTTP server.
// ──────────────────────────────────────────────
const initializeDBAndServer = () => {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error("Error opening database:", err.message);
      process.exit(1);
    }
    console.log("Connected to the SQLite database.");
  });

  // Create table and seed data, then start server
  db.serialize(() => {
    // Create the book table
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
          console.error("Error creating table:", err.message);
          process.exit(1);
        }
      }
    );

    // Seed 10 sample records only when the table is empty
    db.get("SELECT COUNT(*) AS count FROM book", (err, row) => {
      if (err) {
        console.error("Error checking table:", err.message);
        return;
      }

      if (row.count === 0) {
        const sampleBooks = [
          ["The Pragmatic Programmer",        "Andrew Hunt & David Thomas",  1200, 352],
          ["Clean Code",                       "Robert C. Martin",            950,  464],
          ["You Don't Know JS",                "Kyle Simpson",                799,  278],
          ["Eloquent JavaScript",              "Marijn Haverbeke",            650,  472],
          ["JavaScript: The Good Parts",       "Douglas Crockford",           599,  176],
          ["Node.js Design Patterns",          "Mario Casciaro",              1499, 660],
          ["Learning SQL",                     "Alan Beaulieu",               799,  382],
          ["Database System Concepts",         "Abraham Silberschatz",        2200, 1376],
          ["Express in Action",                "Evan Hahn",                   1099, 256],
          ["RESTful Web API Patterns",         "Mike Amundsen",               1350, 312],
        ];

        const stmt = db.prepare(
          "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)"
        );
        sampleBooks.forEach(([title, author, price, pages]) => {
          stmt.run(title, author, price, pages);
        });
        stmt.finalize((err) => {
          if (err) {
            console.error("Error seeding data:", err.message);
          } else {
            console.log("Inserted 10 sample book records.");
          }
        });
      }
    });
  });

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });
};

// ══════════════════════════════════════════════
//  API 1 – GET /books/
//  Retrieve all books
// ══════════════════════════════════════════════
app.get("/books/", (req, res) => {
  const sqlQuery = "SELECT * FROM book";
  db.all(sqlQuery, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    res.status(200).json(rows);
  });
});

// ══════════════════════════════════════════════
//  API 2 – GET /books/:bookId/
//  Retrieve a single book by ID
// ══════════════════════════════════════════════
app.get("/books/:bookId/", (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);

  if (isNaN(bookId) || bookId <= 0) {
    return res.status(400).json({ error: "Invalid Book ID. ID must be a positive integer." });
  }

  const sqlQuery = "SELECT * FROM book WHERE id = ?";
  db.get(sqlQuery, [bookId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: `Book with ID ${bookId} not found.` });
    }
    res.status(200).json(row);
  });
});

// ══════════════════════════════════════════════
//  API 3 – POST /books/
//  Add a new book
// ══════════════════════════════════════════════
app.post("/books/", (req, res) => {
  const { title, author, price, pages } = req.body;

  // Validate required fields
  if (!title || !author || price === undefined || pages === undefined) {
    return res
      .status(400)
      .json({ error: "Missing required fields: title, author, price, pages." });
  }

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "Invalid value for 'title'. Must be a non-empty string." });
  }
  if (typeof author !== "string" || author.trim() === "") {
    return res.status(400).json({ error: "Invalid value for 'author'. Must be a non-empty string." });
  }
  if (typeof price !== "number" || price < 0) {
    return res.status(400).json({ error: "Invalid value for 'price'. Must be a non-negative number." });
  }
  if (typeof pages !== "number" || pages <= 0) {
    return res.status(400).json({ error: "Invalid value for 'pages'. Must be a positive number." });
  }

  const sqlQuery =
    "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)";
  db.run(sqlQuery, [title.trim(), author.trim(), price, pages], function (err) {
    if (err) {
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    res.status(201).json({
      message: "Book added successfully.",
      bookId: this.lastID,
    });
  });
});

// ══════════════════════════════════════════════
//  API 4 – PUT /books/:bookId/
//  Update an existing book
// ══════════════════════════════════════════════
app.put("/books/:bookId/", (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);

  if (isNaN(bookId) || bookId <= 0) {
    return res.status(400).json({ error: "Invalid Book ID. ID must be a positive integer." });
  }

  const { title, author, price, pages } = req.body;

  // At least one field must be provided
  if (!title && !author && price === undefined && pages === undefined) {
    return res
      .status(400)
      .json({ error: "Provide at least one field to update: title, author, price, pages." });
  }

  // Check the book exists first
  db.get("SELECT * FROM book WHERE id = ?", [bookId], (err, existingBook) => {
    if (err) {
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    if (!existingBook) {
      return res.status(404).json({ error: `Book with ID ${bookId} not found.` });
    }

    // Merge incoming fields with existing values
    const updatedTitle  = title  !== undefined ? title.trim()   : existingBook.title;
    const updatedAuthor = author !== undefined ? author.trim()  : existingBook.author;
    const updatedPrice  = price  !== undefined ? price          : existingBook.price;
    const updatedPages  = pages  !== undefined ? pages          : existingBook.pages;

    // Field-level validation on provided values
    if (title !== undefined && updatedTitle === "") {
      return res.status(400).json({ error: "title cannot be empty." });
    }
    if (author !== undefined && updatedAuthor === "") {
      return res.status(400).json({ error: "author cannot be empty." });
    }
    if (price !== undefined && (typeof price !== "number" || price < 0)) {
      return res.status(400).json({ error: "Invalid value for 'price'. Must be a non-negative number." });
    }
    if (pages !== undefined && (typeof pages !== "number" || pages <= 0)) {
      return res.status(400).json({ error: "Invalid value for 'pages'. Must be a positive number." });
    }

    const sqlQuery =
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?";
    db.run(sqlQuery, [updatedTitle, updatedAuthor, updatedPrice, updatedPages, bookId], function (err) {
      if (err) {
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
      }
      res.status(200).json({ message: `Book with ID ${bookId} updated successfully.` });
    });
  });
});

// ══════════════════════════════════════════════
//  API 5 – DELETE /books/:bookId/
//  Remove a book by ID
// ══════════════════════════════════════════════
app.delete("/books/:bookId/", (req, res) => {
  const bookId = parseInt(req.params.bookId, 10);

  if (isNaN(bookId) || bookId <= 0) {
    return res.status(400).json({ error: "Invalid Book ID. ID must be a positive integer." });
  }

  // Check the book exists first
  db.get("SELECT * FROM book WHERE id = ?", [bookId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: `Book with ID ${bookId} not found.` });
    }

    const sqlQuery = "DELETE FROM book WHERE id = ?";
    db.run(sqlQuery, [bookId], function (err) {
      if (err) {
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
      }
      res.status(200).json({ message: `Book with ID ${bookId} deleted successfully.` });
    });
  });
});

// ──────────────────────────────────────────────
//  404 handler for unrecognised routes
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ──────────────────────────────────────────────
//  Start the application
// ──────────────────────────────────────────────
initializeDBAndServer();
