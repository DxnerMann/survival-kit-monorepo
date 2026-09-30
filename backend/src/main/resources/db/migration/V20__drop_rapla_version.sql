DELETE FROM courses WHERE version IS DISTINCT FROM 'v2';

CREATE TABLE courses_v20 (
    course TEXT PRIMARY KEY,
    url TEXT NOT NULL
);

INSERT INTO courses_v20 (course, url)
SELECT course, url
FROM courses
WHERE version = 'v2';

DROP TABLE courses;

ALTER TABLE courses_v20 RENAME TO courses;
