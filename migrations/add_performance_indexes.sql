-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS meetings_user_id_idx ON meetings(user_id);
CREATE INDEX IF NOT EXISTS meetings_user_id_created_at_idx ON meetings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meetings_folder_id_idx ON meetings(folder_id);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON meetings(status);
CREATE INDEX IF NOT EXISTS notes_meeting_id_idx ON notes(meeting_id);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);
