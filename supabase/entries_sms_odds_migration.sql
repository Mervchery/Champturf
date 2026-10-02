-- Adds a second odds column so an entry can carry quotes from two
-- Mauritian wagering channels side by side: the existing `odds` column
-- becomes the MTC tote price, and `sms_odds` is the SMS Pariaz price.
-- Both are free-text (matches the existing `odds` column) since prices
-- are often shown as a ratio ("5/2") rather than a plain decimal.

alter table public.race_entries add column if not exists sms_odds text;
