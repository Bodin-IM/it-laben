-- Consolidate sections without changing student activity IDs. Preserve restrictive
-- choices: any unopened section keeps Backend upcoming until a teacher opens it.
INSERT INTO module_publication(module_id,status)
SELECT 'backend', CASE
  WHEN COUNT(*) < 3 OR SUM(status='upcoming') > 0 THEN 'upcoming'
  WHEN SUM(status='completed') = 3 THEN 'completed'
  ELSE 'active'
END
FROM module_publication
WHERE module_id IN ('meldingens-reise','data-og-lagring','innlogging-og-tilgang');
-- Historical rows and audit records remain; they are no longer listed as modules.
