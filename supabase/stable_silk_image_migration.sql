-- Stables now show an actual silk image (like horses do via
-- horse_silk_image_migration.sql) instead of the generated SVG that was
-- drawn from silk_primary/secondary/cap/pattern (design_upgrade_migration.sql).
--
-- Those color/pattern columns are left in place — nothing else reads them
-- now, but dropping them isn't necessary and this keeps the migration
-- reversible if generated silks come back for some other purpose.
alter table public.stables add column if not exists silk_image_url text;
