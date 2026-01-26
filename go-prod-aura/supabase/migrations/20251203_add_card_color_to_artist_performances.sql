alter table public.artist_performances
  add column if not exists card_color text;

comment on column public.artist_performances.card_color is 'Couleur hex optionnelle pour styliser les cartes de timeline';


















