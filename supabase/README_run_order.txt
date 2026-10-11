Run these in the Supabase SQL editor, in this order (each is safe to re-run):
1. fix_gujadhur_trainers.sql            (already in project, if not yet run)
2. merge_duplicate_trainers.sql         (merges S. Mootien / SM Mahadia / S. Narang / C. Daby / V. Ruhee duplicates)
3. create_stables_from_trainers.sql     (one stable per trainer, linked)
4. add_missing_horses.sql               (adds the horses missing from the DB with rating + trainer)
5. load_horse_ratings.sql               (ratings for existing horses)
6. scratched_migration.sql              (needed BEFORE deploying the new site/scraper code)
Optional diagnostic: check_gujadhur_attribution.sql
