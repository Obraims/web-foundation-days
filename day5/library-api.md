# Library REST API Design

This document specifies the REST API design for managing the **books** resource in a digital library system.

---

## Endpoints

### 1. List All Books
- **Method:** `GET`
- **Path:** `/books`
- **Description:** Retrieves a complete list of all books available in the library collection.
- **Example Request Body:** None
- **Success Status Code:** `200 OK`

### 2. List Books by Author
- **Method:** `GET`
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Retrieves all books written by a specific author using a query parameter.
- **Example Request Body:** None
- **Success Status Code:** `200 OK`

### 3. Get One Book by ID
- **Method:** `GET`
- **Path:** `/books/:id`
- **Description:** Retrieves the details of a single book specified by its unique identifier.
- **Example Request Body:** None
- **Success Status Code:** `200 OK`

### 4. Create a New Book
- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book entry to the library catalog.
- **Example Request Body:**
  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "isbn": "9780385474542",
    "publishedYear": 1958
  }
  ```
- **Success Status Code:** `201 Created`

### 5. Update a Book
- **Method:** `PUT` (or `PATCH`)
- **Path:** `/books/:id`
- **Description:** Updates the information of an existing book identified by ID.
- **Example Request Body:**
  ```json
  {
    "title": "Things Fall Apart (Revised Edition)",
    "author": "Chinua Achebe",
    "isbn": "9780385474542",
    "publishedYear": 1958
  }
  ```
- **Success Status Code:** `200 OK`

### 6. Delete a Book
- **Method:** `DELETE`
- **Path:** `/books/:id`
- **Description:** Removes a book entry permanently from the library catalog by its ID.
- **Example Request Body:** None
- **Success Status Code:** `204 No Content` (or `200 OK`)

---

## Error Codes

### 400 Bad Request
- **Explanation:** Returned when the server cannot process the request due to client error, such as invalid request syntax, missing required fields, or malformed JSON payloads.
- **Concrete Library Example:** Sending a `POST /books` request with a missing required field (e.g. omitting the `"title"` field in the JSON body) or providing an invalid published year format (e.g., `"publishedYear": "invalid_year"`).

### 404 Not Found
- **Explanation:** Returned when the server cannot locate the requested resource because the specified path or ID does not exist in the database.
- **Concrete Library Example:** Requesting `GET /books/9999` or `DELETE /books/9999` when no book with ID `9999` exists in the library system.
