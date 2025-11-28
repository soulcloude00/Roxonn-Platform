-- Create course_assignments table
CREATE TABLE IF NOT EXISTS course_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course TEXT NOT NULL,
    assignment_link TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index on user_id and course for faster queries
CREATE INDEX IF NOT EXISTS course_assignments_user_id_idx ON course_assignments(user_id);
CREATE INDEX IF NOT EXISTS course_assignments_course_idx ON course_assignments(course);
CREATE INDEX IF NOT EXISTS course_assignments_user_course_idx ON course_assignments(user_id, course);

