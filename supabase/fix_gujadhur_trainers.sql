-- Gives the two Gujadhur trainers their real names (Supertote shows both as "R. Gujadhur" / "Gujadhur"):
--   plain "Gujadhur"  -> Ramapatee Gujadhur
--   "R. Gujadhur"     -> Rameshwar Gujadhur
-- Renaming keeps each row's id, so every horse, result and entry stays linked. If a row with the new name already
-- exists (the scraper ran first), the old row is merged into it instead. Run once, BEFORE the next scrape.
do $$
declare
  pair text[];
  old_id uuid;
  new_id uuid;
begin
  foreach pair slice 1 in array array[array['gujadhur', 'Ramapatee Gujadhur'], array['r gujadhur', 'Rameshwar Gujadhur']]
  loop
    select id into old_id from public.trainers where normalized_name = pair[1];
    select id into new_id from public.trainers where normalized_name = public.normalize_name(pair[2]);
    if old_id is null then
      continue;
    elsif new_id is null then
      update public.trainers set name = pair[2] where id = old_id;
    else
      update public.race_results set trainer_id = new_id where trainer_id = old_id;
      update public.race_entries set trainer_id = new_id where trainer_id = old_id;
      update public.horses set trainer_id = new_id where trainer_id = old_id;
      update public.stables set trainer_id = new_id where trainer_id = old_id;
      delete from public.trainers where id = old_id;
      perform public.recompute_trainer_stats(new_id);
    end if;
  end loop;
end $$;
