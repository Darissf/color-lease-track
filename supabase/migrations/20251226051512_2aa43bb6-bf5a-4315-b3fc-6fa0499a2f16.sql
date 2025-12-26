-- Phase 1: Database Cleanup - Remove all WAHA/VPS related tables and columns

-- Drop VPS/Agent tables (with CASCADE to handle foreign keys)
DROP TABLE IF EXISTS public.agent_command_outputs CASCADE;
DROP TABLE IF EXISTS public.agent_commands CASCADE;
DROP TABLE IF EXISTS public.agent_logs CASCADE;
DROP TABLE IF EXISTS public.vps_agents CASCADE;
DROP TABLE IF EXISTS public.vps_installation_progress CASCADE;
DROP TABLE IF EXISTS public.vps_installation_sessions CASCADE;
DROP TABLE IF EXISTS public.vps_credentials CASCADE;

-- Remove WAHA columns from whatsapp_settings
ALTER TABLE public.whatsapp_settings 
  DROP COLUMN IF EXISTS waha_api_url,
  DROP COLUMN IF EXISTS waha_api_key,
  DROP COLUMN IF EXISTS waha_session_name;

-- Remove WAHA columns from whatsapp_numbers  
ALTER TABLE public.whatsapp_numbers
  DROP COLUMN IF EXISTS waha_api_url,
  DROP COLUMN IF EXISTS waha_api_key,
  DROP COLUMN IF EXISTS waha_session_name;