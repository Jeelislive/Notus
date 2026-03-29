-- Add detected_language column to meetings table
ALTER TABLE meetings ADD COLUMN detected_language TEXT DEFAULT 'auto';

-- Create index for faster queries on language
CREATE INDEX idx_meetings_detected_language ON meetings(detected_language);
