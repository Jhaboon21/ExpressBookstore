process.env.NODE_ENV = "test";

const app = require('../app');
const db = require("../db");
const request = require('supertest');

let book_isbn;
beforeEach(async function () {
    let result = await db.query(
        `INSERT INTO books (isbn, amazon_url, author, language, pages, publisher, title, year) 
        VALUES ('123456789', 'https://amazon.com', 'Harry', 'English', 100, 'Test Publisher', 'Test Book', 2024) 
        RETURNING isbn`
    );
    book_isbn = result.rows[0].isbn
})

describe('POST /books', function () {
    test("create a new book", async function () {
        const res = await request(app)
            .post('/books')
            .send({
                isbn: '123123123',
                amazon_url: "https://amazon.com/test", 
                author: "John", 
                language: "English", 
                pages: 10, 
                publisher: "Me", 
                title: "Definitely Real Book", 
                year: 2023
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.book).toHaveProperty("isbn");
    });

    test("Validate/respond if creating a book with missing values", async function () {
        const res = await request(app)
            .post('/books')
            .send({ pages: 20000 });
        expect(res.statusCode).toBe(400);
    });
});

describe("GET /books", function () {
    test("Get a list of a book", async function () {
        const res = await request(app).get('/books');
        const books = res.body.books;
        expect(books).toHaveLength(1);
        expect(books[0]).toHaveProperty('isbn');
        expect(books[0]).toHaveProperty('title');
    });
});

describe("GET /books/:isbn", function () {
    test("Get a single book", async function () {
        const res = await request(app).get(`/books/${book_isbn}`);
        expect(res.body.book).toHaveProperty("isbn");
        expect(res.body.book.isbn).toBe(book_isbn);
    });

    test("Respond with 404 if it cannot find book", async function () {
        const res = await request(app).get('/books/99999');
        expect(res.statusCode).toBe(404);
    });
});

describe("PUT /books/:id", function () {
    test("Update a single book", async function () {
        const res = await request(app)
            .put(`/books/${book_isbn}`)
            .send({
                amazon_url: "https://amazon.com/other", 
                author: "different person", 
                language: "English", 
                pages: 1000, 
                publisher: "new publisher", 
                title: "Updated Book", 
                year: 2024
            });
        expect(res.body.book).toHaveProperty('isbn');
        expect(res.body.book.title).toBe('Updated Book');
    });

    test("Prevent a bad update on book", async function () {
        const res = await request(app)
            .put(`/books/${book_isbn}`)
            .send({
                isbn: "123465762",
                badField: "DO NOT ADD ME!",
                amazon_url: "https://amazon.com",
                author: "different person",
                language: "English",
                pages: 1000,
                publisher: "new publisher",
                title: "Updated Book",
                year: 2024
            });
        expect(res.statusCode).toBe(400);
    });

    test("Respond with 404 if it cannot find book", async function () {
        await request(app).delete(`/books/${book_isbn}`);
        const res = await request(app).delete(`/books/${book_isbn}`);
        expect(res.statusCode).toBe(404);
    });
});

describe("DELETE /books/:id", function () {
    test("Deletes a single a book", async function () {
      const response = await request(app)
          .delete(`/books/${book_isbn}`)
      expect(response.body).toEqual({message: "Book deleted"});
    });
});

afterEach(async function () {
    await db.query("DELETE FROM books");
});
  
  
afterAll(async function () {
    await db.end()
});