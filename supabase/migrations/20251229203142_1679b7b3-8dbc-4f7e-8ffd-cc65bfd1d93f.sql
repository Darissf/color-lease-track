-- First, delete any duplicate entries keeping only the most recent one per user
DELETE FROM document_settings a
USING document_settings b
WHERE a.id < b.id 
AND a.user_id = b.user_id;

-- Add UNIQUE constraint on user_id for upsert to work
ALTER TABLE document_settings 
ADD CONSTRAINT document_settings_user_id_key UNIQUE (user_id);