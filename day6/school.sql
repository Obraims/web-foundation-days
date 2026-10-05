-- Enable foreign key constraints in SQLite
PRAGMA foreign_keys = ON;

-- ==========================================
-- TABLE CREATION
-- ==========================================

-- Table 1: students
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- Table 2: courses
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);

-- Table 3: enrolments (Join table resolving M:N relationship)
CREATE TABLE enrolments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE (student_id, course_id)
);

-- ==========================================
-- INDEX CREATION
-- ==========================================
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

-- ==========================================
-- SAMPLE DATA INSERTION
-- ==========================================

-- Insert 4 students (3 enrolled, 1 without enrolments)
INSERT INTO students (name, email) VALUES
('Alice Smith', 'alice@example.com'),
('Bob Jones', 'bob@example.com'),
('Charlie Brown', 'charlie@example.com'),
('Diana Prince', 'diana@example.com'); -- Diana has no enrolments

-- Insert 3 courses
INSERT INTO courses (title, code) VALUES
('Web Development', 'CS101'),
('Database Systems', 'CS102'),
('Software Engineering', 'CS103');

-- Insert 5 enrolments with grades
INSERT INTO enrolments (student_id, course_id, grade) VALUES
(1, 1, 'A'),   -- Alice in Web Development
(1, 2, 'B+'),  -- Alice in Database Systems
(2, 1, 'A-'),  -- Bob in Web Development
(2, 3, 'B'),   -- Bob in Software Engineering
(3, 2, 'A');   -- Charlie in Database Systems

-- ==========================================
-- REQUIRED QUERIES
-- ==========================================

-- 1. All courses for one student (by name)
SELECT 
    s.name AS student_name,
    c.code AS course_code,
    c.title AS course_title,
    e.grade,
    e.enrolled_at
FROM enrolments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id
WHERE s.name = 'Alice Smith';

-- 2. All students on one course (by title)
SELECT 
    c.title AS course_title,
    s.name AS student_name,
    s.email AS student_email,
    e.grade
FROM enrolments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id
WHERE c.title = 'Web Development';

-- 3. The number of students per course
SELECT 
    c.id AS course_id,
    c.code AS course_code,
    c.title AS course_title,
    COUNT(e.student_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.code;

-- 4. Students who have no enrolments
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    s.email AS student_email
FROM students s
LEFT JOIN enrolments e ON s.id = e.student_id
WHERE e.id IS NULL;

-- 5. Update one enrolment's grade
UPDATE enrolments 
SET grade = 'A+' 
WHERE student_id = 1 AND course_id = 2;
