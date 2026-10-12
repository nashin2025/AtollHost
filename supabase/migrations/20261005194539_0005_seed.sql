insert into public.organizations(id,name,slug) values('00000000-0000-0000-0000-000000000001','AtollHost Demo Agency','demo-agency') on conflict do nothing;
insert into public.properties(id,organization_id,name,island,atoll,status) values
('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','Samudra Guesthouse','Thulusdhoo','Kaafu Atoll','active'),
('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001','Lagoon View Inn','Maafushi','Kaafu Atoll','active'),
('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','Island Breeze','Dhigurah','Alif Dhaal Atoll','onboarding') on conflict do nothing;
