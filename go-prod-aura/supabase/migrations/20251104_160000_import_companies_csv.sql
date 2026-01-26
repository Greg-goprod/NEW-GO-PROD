-- =============================================================================
-- Import des sociétés depuis l'ancienne base de données
-- Source: contact_company_rows.csv
-- Date: 2025-01-04
-- =============================================================================

-- Désactiver temporairement les triggers pour accélérer l'import
SET session_replication_role = replica;

-- Import des sociétés dans crm_companies
INSERT INTO public.crm_companies (
  id,
  company_id,
  company_name,
  brand_name,
  is_supplier,
  is_client,
  status_label,
  website_url,
  main_email,
  main_phone,
  address_line1,
  city,
  country,
  zip_code,
  tax_id,
  registration_number,
  iban,
  swift_bic,
  payment_terms,
  currency_preferred,
  created_at,
  updated_at
) VALUES
  ('151872d6-2acb-4283-bdc0-43e76026a76a', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Bleu Citron', 'Bleu Citron', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 07:53:05.488995+00', '2025-09-16 10:36:32.012101+00'),
  ('19a5c5ec-1e84-498f-9222-88de4a37175b', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'MAD Productions SA', 'MAD Productions SA', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 14:14:41.263392+00', '2025-09-16 10:36:32.012101+00'),
  ('2d5cc57e-dd20-401f-9d07-6fe18464f26b', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'ryser groupe', 'ryser groupe', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 09:07:59.113812+00', '2025-09-17 09:07:59.113812+00'),
  ('2e4c8abe-8560-4100-ab14-7692f6beb9b3', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Sony Music', 'Sony Music', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-06 08:40:24.789859+00', '2025-09-16 10:36:32.012101+00'),
  ('2f0a3ac1-746b-41c0-a7fa-c8e5b8b6d385', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'SUZETTE', 'SUZETTE', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-10 13:47:18.523473+00', '2025-09-16 10:36:32.012101+00'),
  ('31cd028c-9397-4f95-9aaf-60f81823dd48', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Play Two', 'Play Two', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 07:47:16.740466+00', '2025-09-16 10:36:32.012101+00'),
  ('379a490c-6d75-4edb-b817-10792acea7d4', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'W Spectacle', 'W Spectacle', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 13:51:41.003532+00', '2025-09-16 10:36:32.012101+00'),
  ('4289ab42-c949-4980-b53d-8e081f262443', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Dynaprod', 'Dynaprod', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-22 18:45:42.978472+00', '2025-09-16 10:36:32.012101+00'),
  ('49ae1b66-06f4-4c12-b1d9-9ddf076e2811', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'TCO prod', 'TCO prod', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-23 13:13:23.740598+00', '2025-09-16 10:36:32.012101+00'),
  ('4d10223d-cad0-4670-bcab-bcf5f4ee3638', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Hiro Prod', 'Hiro Prod', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 13:00:05.020962+00', '2025-09-16 10:36:32.012101+00'),
  ('4d546022-4a7b-42a2-a7dc-1b2ba51ed126', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'aacompany', 'aacompany', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-28 20:12:23.944842+00', '2025-09-16 10:36:32.012101+00'),
  ('505ca7b7-0aec-4175-a80c-4dae54454666', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Inouïe', 'Inouïe', true, false, 'actif', 'https://www.inouie.ch/', 'info@inouie.ch', NULL, NULL, NULL, 'France', NULL, 'CHE-177.799.344', NULL, 'CH76 8080 8004 3098 7800 1', NULL, NULL, NULL, '2025-09-01 10:10:35.134156+00', '2025-09-16 10:36:32.012101+00'),
  ('6dd8f5db-a7cf-4a9f-af39-884d4ad2dfc5', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Warner Music', 'Warner Music', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-06 09:01:19.837046+00', '2025-09-16 10:36:32.012101+00'),
  ('7d947800-7ee8-4e46-ba03-776a48e4e9f2', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'W Live', 'W Live', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 13:31:59.480963+00', '2025-09-16 10:36:32.012101+00'),
  ('93a6876a-9ce0-414c-b88a-8728e26c0f66', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Soldout Prod.', 'Soldout Prod.', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 13:16:47.612403+00', '2025-09-16 10:36:32.012101+00'),
  ('b87a1ebd-3ca0-451d-ad0c-9e0d4aa7abaa', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Live Nation', 'Live Nation', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-23 07:43:19.927605+00', '2025-09-16 10:36:32.012101+00'),
  ('bdae4b99-7e75-43e9-b7d2-b218fa3efd46', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'ISHTAR MUSIC', 'ISHTAR MUSIC', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-01 11:33:55.67043+00', '2025-09-16 10:36:32.012101+00'),
  ('bec112e7-4b9e-4c6a-8554-90fe432b2ba0', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'VENOGE FESTIVAL', 'VENOGE FESTIVAL', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-06-11 13:29:08.720291+00', '2025-09-16 10:36:32.012101+00'),
  ('dcbeb692-d607-4e6a-864b-4cfd9f0b6eae', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'P2com', 'P2com', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-06 09:55:49.354365+00', '2025-09-16 10:36:32.012101+00'),
  ('df6c2dc5-4d4c-41ee-9fa6-9510ec228ec2', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'OPUS ONE', 'OPUS ONE', true, false, 'actif', 'opus-one.ch', NULL, '+41223651202', NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-01 11:25:37.82228+00', '2025-09-16 10:36:32.012101+00'),
  ('e6f60f62-1e8a-4d92-947d-ce6943f43628', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Universal Music', 'Universal Music', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-06 09:53:22.642591+00', '2025-09-16 10:36:32.012101+00'),
  ('e7d09762-e3b3-4985-8830-c79504919760', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Treize 16', 'Treize 16', true, false, 'actif', NULL, NULL, NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-07-23 12:48:52.919307+00', '2025-09-16 10:36:32.012101+00')
ON CONFLICT (id) DO NOTHING;

-- Réactiver les triggers
SET session_replication_role = DEFAULT;

-- Afficher un résumé de l'import
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.crm_companies;
  RAISE NOTICE '✅ Import terminé: % sociétés dans crm_companies', v_count;
END $$;













