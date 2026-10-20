alter table post_versions
  add column public_editorial jsonb,
  add constraint post_versions_public_editorial_object
    check (public_editorial is null or jsonb_typeof(public_editorial) = 'object');
