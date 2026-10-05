# School Database Design

This document details the relational database design for a school management system tracking **students**, **courses**, and their **enrolments**.

---

## 1. Table Explanations

- **`students`**: Stores registered student profiles.
  - **Primary Key:** `id` (`INTEGER PRIMARY KEY AUTOINCREMENT`)
  - **Attributes:** `name` (`TEXT NOT NULL`), `email` (`TEXT NOT NULL UNIQUE`).

- **`courses`**: Stores available academic courses.
  - **Primary Key:** `id` (`INTEGER PRIMARY KEY AUTOINCREMENT`)
  - **Attributes:** `title` (`TEXT NOT NULL`), `code` (`TEXT NOT NULL UNIQUE`).

- **`enrolments`**: The associative junction table linking students to their enrolled courses.
  - **Primary Key:** `id` (`INTEGER PRIMARY KEY AUTOINCREMENT`)
  - **Foreign Keys:** `student_id` (references `students.id`), `course_id` (references `courses.id`).
  - **Relationship Attributes:** `grade` (`TEXT`), `enrolled_at` (`TEXT DEFAULT CURRENT_TIMESTAMP`).
  - **Integrity Rule:** `UNIQUE (student_id, course_id)` constraint to prevent duplicate enrolments.

---

## 2. Relationships & Join Table

The domain requires a **many-to-many (M:N)** relationship between `students` and `courses`: a single student can enrol in multiple courses, and a single course can have multiple enrolled students. 

In a relational database model, a many-to-many relationship cannot be represented directly with foreign keys placed inside the `students` or `courses` tables without causing data redundancy, unnormalised comma-separated strings, or infinite columns. To resolve this:
- The relationship between `students` and `enrolments` is **one-to-many (1:N)** (a student can have many enrolments).
- The relationship between `courses` and `enrolments` is **one-to-many (1:N)** (a course can have many enrolments).

The `enrolments` join table is essential because it decomposes the M:N relationship into two clean 1:N relationships. Furthermore, it provides a dedicated location to store contextual relationship data—such as the student's `grade` and `enrolled_at` timestamp—while enforcing the `UNIQUE (student_id, course_id)` rule to guarantee data integrity.

---

## 3. Indexing

- **Index Added:** `CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);`
- **Justification:** Without an index on `student_id`, executing a query to list all courses for a specific student (`JOIN` query filtering on `student_id`) requires SQLite to perform a **full table scan** on the `enrolments` table, checking every row sequentially. By adding `idx_enrolments_student_id`, SQLite constructs a B-Tree lookup structure that allows instant $O(\log N)$ point lookups, dramatically accelerating join condition evaluations and filtered queries as the dataset grows to thousands or millions of records.

---

## 4. SQL vs NoSQL Choice

A relational **SQL** database (such as PostgreSQL or SQLite) is the superior architectural choice over a document-oriented NoSQL database for this school management system. A school domain is inherently structured and highly relational, requiring strict data consistency and referential integrity across students, courses, and grade records. SQL foreign key constraints with cascading deletes ensure that orphan enrolment records are never left behind, while unique constraints prevent duplicate enrolments and duplicate student emails at the database engine level. Furthermore, relational databases provide powerful SQL `JOIN` and `GROUP BY` capabilities for complex reporting—such as calculating GPA, computing course enrolment counts, or finding un-enrolled students—without requiring costly manual data aggregation in application code. Finally, ACID transaction guarantees ensure that sensitive operations, such as simultaneous course registration or grade updates, are performed atomically and reliably without risk of data corruption.
