-- Merges duplicate trainers (and their duplicate stables) into ONE row per real person,
-- moves every result / entry / horse onto the survivor, then recomputes wins and counts.
-- Cause of the duplicates: the scraper stored "S. Mootien" etc., and my earlier stables script
-- created "M Mootien" etc. because it did not know they were the same people.
-- Safe to re-run. Does NOT touch the Gujadhur trainers/stables.

do $$
declare
  grp record;
  surv uuid;
  surv_stable uuid;
  loser_trainers uuid[];
  loser_stables uuid[];
  v_norm text[];
  all_trainers uuid[];
begin
  for grp in
    select * from (values
      ('Selvon Mootien',     array['Selvon Mootien','Selvom Mootien','S Mootien','S. Mootien','M Mootien']),
      ('Samraj Mahadia',     array['Samraj Mahadia','Somraj Mahadia','S Mahadia','S. Mahadia','SM Mahadia']),
      ('Shirish Narang',     array['Shirish Narang','S Narang','S. Narang']),
      ('Chandradutt Daby',   array['Chandradutt Daby','C Daby','C. Daby']),
      ('Vicky Ruhee',        array['Vicky Ruhee','V Ruhee','V. Ruhee','V.Ruhee'])
    ) as v(canon, variants)
  loop
    select array_agg(distinct public.normalize_name(x)) into v_norm from unnest(grp.variants) x;

    -- Survivor trainer = the one with the most race results (oldest on a tie).
    select t.id into surv
    from public.trainers t
    where t.normalized_name = any(v_norm)
    order by (select count(*) from public.race_results r where r.trainer_id = t.id) desc, t.created_at asc
    limit 1;

    if surv is null then
      raise notice 'No trainer found for %, skipped', grp.canon;
      continue;
    end if;

    select coalesce(array_agg(id), '{}') into loser_trainers
      from public.trainers where normalized_name = any(v_norm) and id <> surv;
    all_trainers := loser_trainers || surv;

    -- Survivor stable = prefer one with a silk image, then most horses (keeps hand-made ones).
    select s.id into surv_stable
    from public.stables s
    where s.trainer_id = any(all_trainers) or s.normalized_name = any(v_norm)
    order by (s.silk_image_url is not null) desc, s.horses desc, s.created_at asc
    limit 1;

    select coalesce(array_agg(s.id), '{}') into loser_stables
    from public.stables s
    where (s.trainer_id = any(all_trainers) or s.normalized_name = any(v_norm))
      and s.id is distinct from surv_stable;

    -- Unlink all involved stables first (avoids the one-stable-per-trainer unique index).
    update public.stables set trainer_id = null
      where id = any(loser_stables) or id = surv_stable;

    -- Duplicate stables: move their horses to the survivor stable, then delete them.
    if surv_stable is not null then
      update public.horses set stable_id = surv_stable where stable_id = any(loser_stables);
    end if;
    delete from public.stables where id = any(loser_stables);

    -- Move everything the duplicate trainers own onto the survivor.
    update public.race_results set trainer_id = surv where trainer_id = any(loser_trainers);
    update public.race_entries set trainer_id = surv where trainer_id = any(loser_trainers);
    update public.horses       set trainer_id = surv where trainer_id = any(loser_trainers);
    delete from public.trainers where id = any(loser_trainers);

    -- Proper full name on the survivor.
    update public.trainers set name = grp.canon where id = surv and name is distinct from grp.canon;

    -- Create the stable if none existed; rename it only if it still has the short/trainer name.
    if surv_stable is null then
      insert into public.stables (name) values (grp.canon) returning id into surv_stable;
    else
      update public.stables set name = grp.canon
        where id = surv_stable and normalized_name = any(v_norm) and name is distinct from grp.canon;
    end if;

    -- Link stable <-> trainer (trigger pulls in all of the trainer's horses).
    update public.stables set trainer_id = surv where id = surv_stable;

    raise notice 'Merged % : kept trainer %, stable %, removed % trainer(s) and % stable(s)',
      grp.canon, surv, surv_stable, coalesce(array_length(loser_trainers,1),0), coalesce(array_length(loser_stables,1),0);
  end loop;
end $$;

-- Recompute wins / horse counts / ranking for EVERY trainer and stable, so victories
-- are attributed correctly everywhere (not only for the merged ones).
select public.recompute_trainer_stats(id) from public.trainers;
select public.recompute_trainer_rankings();
select public.recompute_stable_horse_count(id) from public.stables;

-- CHECK 1: the 5 trainers should each appear once, with wins and horses.
select t.name, t.wins, t.horses, s.name as stable
from public.trainers t left join public.stables s on s.trainer_id = t.id
where t.normalized_name in ('selvon mootien','samraj mahadia','shirish narang','chandradutt daby','vicky ruhee')
order by t.name;

-- CHECK 2: any OTHER trainers that look like duplicates (same surname) — send me this result.
select split_part(name, ' ', array_length(string_to_array(name, ' '), 1)) as surname,
       count(*) as n, string_agg(name, ' | ' order by name) as names
from public.trainers
group by 1 having count(*) > 1
order by 1;
