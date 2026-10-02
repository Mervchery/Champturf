-- Silks in Mauritian racing aren't purely a stable property: an owner who
-- has registered their own colors races every horse of theirs in those
-- colors, regardless of which stable trains the horse. A stable's silk is
-- only the default for owners who haven't registered their own. On top of
-- that, an owner with multiple horses in a race sometimes distinguishes
-- them only by cap, keeping the jacket the same — so a per-horse cap
-- override is needed too.
--
-- Resolution order (see lib/silk.ts:resolveSilk): horse.silk_cap_override
-- (cap only) > owner's own silk (if registered) > stable's silk (default).

-- Nullable — null means "this owner hasn't registered their own silk,
-- fall back to the stable's". Unlike stables.silk_* these have no default,
-- since most owners will NOT have their own colors.
alter table public.owners add column if not exists silk_primary text;
alter table public.owners add column if not exists silk_secondary text;
alter table public.owners add column if not exists silk_cap text;
alter table public.owners add column if not exists silk_pattern text
  check (silk_pattern is null or silk_pattern in ('plain', 'hoops', 'stripes', 'quarters', 'spots', 'sash', 'chevron'));

-- Per-horse cap-only override, for horses that otherwise share their
-- owner's (or stable's) silk but need a different cap to be told apart.
alter table public.horses add column if not exists silk_cap_override text;
