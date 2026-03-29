-- Add language preferences to user profiles
ALTER TABLE profiles ADD COLUMN preferred_language TEXT DEFAULT 'en' NOT NULL;
ALTER TABLE profiles ADD COLUMN transcription_language TEXT DEFAULT 'auto' NOT NULL;

-- Create indexes for faster queries
CREATE INDEX idx_profiles_preferred_language ON profiles(preferred_language);
CREATE INDEX idx_profiles_transcription_language ON profiles(transcription_language);
