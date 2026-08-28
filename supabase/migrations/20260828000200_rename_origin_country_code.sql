alter table public.bean_profiles
  rename column origin_country to origin_country_code;

alter table public.bean_profiles
  rename constraint bean_profiles_origin_country_check to bean_profiles_origin_country_code_check;

comment on column public.bean_profiles.origin_country_code is
  'Canonical ISO 3166-1 alpha-2 country code.';
