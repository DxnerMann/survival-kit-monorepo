CREATE TABLE courses_v17 (
    course TEXT NOT NULL,
    version TEXT NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (course, version)
);

INSERT INTO courses_v17 (course, version, url)
SELECT course, 'v1', raplabaseurl
FROM courses
WHERE raplabaseurl IS NOT NULL;

DROP TABLE courses;

ALTER TABLE courses_v17 RENAME TO courses;
