-- Add UNIQUE constraint to ensure one client can only be linked to one user
ALTER TABLE client_groups 
ADD CONSTRAINT client_groups_linked_user_id_unique 
UNIQUE (linked_user_id);