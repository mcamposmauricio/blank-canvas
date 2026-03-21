-- Fix: drop broken triggers on help_collections and help_articles
-- These tables don't have user_id column, so set_tenant_id_from_user crashes
DROP TRIGGER IF EXISTS auto_set_tenant_help_collections ON help_collections;
DROP TRIGGER IF EXISTS auto_set_tenant_help_articles ON help_articles;