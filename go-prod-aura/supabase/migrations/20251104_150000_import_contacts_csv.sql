-- =============================================================================
-- Import des contacts depuis l'ancienne base de données
-- Source: contacts_rows.csv
-- Date: 2025-01-04
-- =============================================================================

-- Désactiver temporairement les triggers pour accélérer l'import
SET session_replication_role = replica;

-- Import des contacts dans crm_contacts
INSERT INTO public.crm_contacts (
  id,
  company_id,
  first_name,
  last_name,
  email_primary,
  phone_mobile,
  photo_url,
  created_at,
  updated_at,
  is_primary_for_company_billing,
  is_night_contact
) VALUES
  ('008e0e76-bd8b-4fda-89d4-a58e1c549816', 'dcbeb692-d607-4e6a-864b-4cfd9f0b6eae', 'Sabine', 'Pytoud', 'sabine@p2com.ch', '+41 79 704 27 58', NULL, '2025-07-06 09:56:14.458753+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('054081d4-1e6c-4130-b885-0cf5b0ae6a19', '93a6876a-9ce0-414c-b88a-8728e26c0f66', 'Joyce', 'Dahler', 'joyce@soldoutprod.com', NULL, NULL, '2025-06-23 13:29:01.160608+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('083d2263-4889-4272-b0ab-b1b95907e009', '2e4c8abe-8560-4100-ab14-7692f6beb9b3', 'Dominique', 'Saudan', 'dominique.saudan@sonymusic.com', '+41 79 357 69 30', NULL, '2025-07-06 08:57:54.301674+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('08b2a70d-83e9-4222-8e35-7dc7cfcd9f74', '19a5c5ec-1e84-498f-9222-88de4a37175b', 'José', 'Camacho', 'camacho@mad.ch', '+41 79 171 69 69', NULL, '2025-06-23 14:17:08.851414+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('10c9f05a-fd5b-4de1-b4aa-d687b51850c7', 'bec112e7-4b9e-4c6a-8554-90fe432b2ba0', 'Greg', 'Fischer', 'artists@venogefestival.ch', '+41794490249', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/10c9f05a-fd5b-4de1-b4aa-d687b51850c7-1750507460499.jpg', '2025-05-27 11:34:16.210193+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('144fdbb6-c5a2-41f7-b1a7-25e1a93f706b', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Darnell', 'Robinson', 'darnellrobinsonmusic@gmail.com', NULL, NULL, '2025-07-11 06:50:35.75575+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('1e8497a4-8357-44ca-9caa-458454508a42', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Romain', 'Malgouyres', 'romain.malgouyres@hotmail.fr', '+33 (0) 7 81 62 78 91', NULL, '2025-06-23 13:08:27.790129+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('2396bf72-5373-450a-8577-41c17d2de686', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Nabil', 'Ghrib', 'nabil.musictour@gmail.com', '06 24 69 00 55', NULL, '2025-06-23 13:46:08.019736+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('26bbaa80-7436-41a3-85fb-0023b6a5ed03', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Mohamed', 'Ali', 'mo@foufounepalace.fr', '+33 (0)6 58 71 98 90', NULL, '2025-06-23 07:54:06.79+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('2a498939-a23e-4df2-9dbf-d22565174560', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Quentin', 'Bak', 'quentin.bak@bonentendeur.com', '+33 6 77 21 84 59', NULL, '2025-07-10 20:20:43.968993+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('352564c5-9237-4b54-8707-7e003afdc6e4', '49ae1b66-06f4-4c12-b1d9-9ddf076e2811', 'JB', 'TCO', 'jb@tcoprod.eu', '+41788752484', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725655220.jpg', '2025-08-23 12:53:08.660872+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('3620f693-eb75-4217-9c81-ee4e2beb8e9c', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'AA', 'TEST', 'aatest@bluewin.ch', NULL, NULL, '2025-07-28 20:12:27.821079+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('3bad4423-52af-4b05-900f-3bd3655f2eec', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Diane', 'Robbe', 'robbe.diane@gmail.com', '+33 7 69 87 56 25', NULL, '2025-07-30 17:41:38.713791+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('3efe35e3-5f7a-4802-831c-76a77e33e90e', 'bec112e7-4b9e-4c6a-8554-90fe432b2ba0', 'Carole', 'Pennec', 'production@venogefestival.ch', '0786583129', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/3efe35e3-5f7a-4802-831c-76a77e33e90e-1750507506809.jpg', '2025-05-27 12:03:18.009164+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('3f405504-b7a7-432e-be33-5ac97031eb7f', '6dd8f5db-a7cf-4a9f-af39-884d4ad2dfc5', 'Sabine', 'Pythoud', 'sabine.pythoud@warnermusic.com', '+41 79 704 27 58', NULL, '2025-07-06 09:02:00.611769+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('40b33ec1-e844-4f65-9dc9-16b57088187b', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Anaëlle', 'Landi', 'anaelle.landi@horizon-musiques.fr', NULL, NULL, '2025-07-11 06:35:55.784063+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('441527bd-3164-4d24-9a37-f8726d550781', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Gisèle', 'Lescuyer', 'gisele.lescuyer@gmail.com', '+33 6 60 79 82 77', NULL, '2025-07-02 08:15:45.425103+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('4cf54d84-d1bb-4a7c-a05e-7063052ca58c', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Céline', 'Poulain', 'poulain1celine@gmail.com', '+33 7 62 17 83 44', NULL, '2025-07-28 19:52:08.954133+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('4d67d9f5-14c2-4868-bdd3-0d76bfbb019f', 'bec112e7-4b9e-4c6a-8554-90fe432b2ba0', 'Simon', 'Roueche', 'venue-manager@venogefestival.ch', '+41 79 812 18 17', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/4d67d9f5-14c2-4868-bdd3-0d76bfbb019f-1750507580608.jpg', '2025-06-05 05:44:52.883017+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('595ff4c9-8bef-4ed3-9597-2dbc3219129a', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'David', 'Robinson', 'hello-dbevents@mail.com', NULL, NULL, '2025-07-22 14:55:25.823357+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('5c16c22e-0a4b-458f-9a50-7d02b577aa18', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Dylan', 'Chubb', 'dylandoowop@gmail.com', '+33 (0)6 58 36 67 22', NULL, '2025-06-23 13:11:21.459507+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('5ca6df33-d9f5-4227-938e-d12842ebdd19', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Rayo', 'Papy', 'papyrayo@gmail.com', '06 26 39 95 25', NULL, '2025-08-01 09:48:52.134997+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('6a4e75c2-a165-4252-891a-a3eb182d4550', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Antoine "Varosa"', 'Yvon', 'antoinevarosa@gmail.com', '+33 (0)7 44 74 23 82', NULL, '2025-07-11 05:43:48.202604+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('6e9a021c-6c50-431c-a0ba-adc0f2305813', '4d10223d-cad0-4670-bcab-bcf5f4ee3638', 'Julie', 'Fournier', 'julie@hiroprod.com', '+33 (0)6 77 54 05 63', NULL, '2025-06-23 13:00:17.152295+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('73ca6412-c2ff-4cf1-8bec-0b68649c235f', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Christian', 'Parisot', 'c.parisot78@gmail.com', '+33 6 43 72 04 42', NULL, '2025-06-23 13:41:22.384188+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('7bed316c-a145-4e72-99bd-fdc03178f7d3', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Robert', 'Stewart', 'rsconcerts@earthlink.net', '1.917.690.9436', NULL, '2025-06-23 13:02:42.814131+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('7e7f50b5-aed6-4da5-84ce-7ed0c0347d35', 'b87a1ebd-3ca0-451d-ad0c-9e0d4aa7abaa', 'Julien', 'Le Gauffey', 'julienlg1@hotmail.com', '+33 6 61 09 84 37', NULL, '2025-06-23 07:43:30.859706+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('8c548e4d-126e-491e-86bd-a78b346efd38', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Philippe', 'Guerreiro', 'guerreiroprod@gmail.com', '+33 661 48 44 87', NULL, '2025-06-23 13:47:52.757742+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('8ee688d3-49e7-4b49-9288-c30081d8074b', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Sakage', 'Sakage', 'sakage31@gmail.com', NULL, NULL, '2025-07-10 17:31:40.655743+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('8f0990ff-cba7-4515-be9b-fa89a7344264', '379a490c-6d75-4edb-b817-10792acea7d4', 'Léa', 'Daher', 'lea.daher@wspectacle.com', '01 76 74 93 20', NULL, '2025-06-23 13:52:26.69671+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('a56efd1c-9fac-4880-9aaf-d3cc29196a25', '93a6876a-9ce0-414c-b88a-8728e26c0f66', 'Ian', 'Riehling', 'prod@soldoutprod.com', '+ 41 79 539 21 01', NULL, '2025-06-23 13:16:55.663111+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('a9c56e57-02d7-4898-b21d-81f625f4ea89', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Sylvère', 'Hieulle', 'sylverecauchemar@gmail.com', '+33 617 933 065', NULL, '2025-06-23 13:38:52.761436+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('b293df57-72b4-47a1-ae37-122e5e228d1e', '31cd028c-9397-4f95-9aaf-60f81823dd48', 'Jules', 'Reiffers', 'jreiffers@playtwo.fr', '06 68 02 49 86', NULL, '2025-06-23 07:49:31.524755+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('b29a2673-3a67-4fb1-9e55-30641a4953ef', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Gary', 'Burke', 'riga@hemphigher.com', '+41 78 921 55 31', NULL, '2025-06-23 07:51:49.479475+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('b7ec4a9d-d113-4504-9eb7-328bee933e3e', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Henry', 'Dessources', 'henrydessources@gmail.com', '+1 954 243 225', NULL, '2025-06-23 13:15:01.132209+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('ba30ea13-77ff-440d-9c20-c4863294ce94', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Yaron', 'Levy', 'yaron@ub40.global', '‭+44 7973 231040‬', NULL, '2025-07-10 17:13:04.439734+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('c0abab16-c3db-49fc-8817-c20cc9517476', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Jean-Marc', 'Poignot', 'jmpoignot@gmail.com', '+33 6 26 87 27 18', NULL, '2025-06-23 13:04:29.60508+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('c59a9184-8d4f-4901-b2ca-895ba43da24e', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Mathilde', 'Viaud', 'viaudmathilde@gmail.com', '+33 (0) 6 73 10 77 58', NULL, '2025-06-23 13:06:29.069088+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('ce59f5dd-2ac0-4ae8-8366-bc04ce6f3036', '31cd028c-9397-4f95-9aaf-60f81823dd48', 'Anaëlle', 'Marsaudon', 'amarsaudon@playtwo.fr', '06 21 33 25 54', NULL, '2025-06-23 07:47:48.755035+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('d1962b96-f4f3-4961-962c-0838238290a1', 'df6c2dc5-4d4c-41ee-9fa6-9510ec228ec2', 'Antoine', 'Grenon', 'antoine.grenon@opus-one.ch', '+41 79 529 29 56', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726013401.jpg', '2025-09-01 11:26:56.407379+00', '2025-10-09 14:00:45.54184+00', false, false),
  ('d787558e-56bb-4e5f-9c12-5129a60f28f1', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Xavier', 'Marchand', 'contact@xaviermarchand.com', '+33 (0)6 73 80 56 56', NULL, '2025-06-24 20:02:23.352579+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('dbc61307-d82c-4096-a55c-c91027428d2d', '49ae1b66-06f4-4c12-b1d9-9ddf076e2811', 'Lionel', 'Martin', 'admin@tcoprod.eu', NULL, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756728833483.jpg', '2025-09-01 12:13:56.672025+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('dc958eb2-f37c-4017-8e2f-0e52174bfcaf', '7d947800-7ee8-4e46-ba03-776a48e4e9f2', 'Gaëlle', 'Couturier', 'gaelle.couturier@w-live.fr', '+33 (0) 6 95 53 87 38', NULL, '2025-06-23 13:33:45.835721+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('de9b7525-876b-44f6-bc91-69a500b95c2e', 'bec112e7-4b9e-4c6a-8554-90fe432b2ba0', 'Sonia', 'Bra', 'sonia.bra@venogefestival.ch', '0763726408', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/de9b7525-876b-44f6-bc91-69a500b95c2e-1750507521625.jpg', '2025-06-05 05:46:38.277615+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('df64b309-6a23-45da-bb89-f765e30fd4dc', 'bec112e7-4b9e-4c6a-8554-90fe432b2ba0', 'Natalie', 'Geerts', 'presse@venogefestival.ch', NULL, 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/df64b309-6a23-45da-bb89-f765e30fd4dc-1750659379159.jpg', '2025-06-23 06:08:02.869004+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('e2240eec-fd3a-4689-9fb0-eabc6f68b344', 'e7d09762-e3b3-4985-8830-c79504919760', 'Elise', 'Manjot', 'elise@treizeseize.com', '+ 33 (0)6 75 96 29 79', NULL, '2025-07-23 12:52:14.184621+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('e2479a0a-5130-4faf-9c5c-20f76fcd5ba4', '4289ab42-c949-4980-b53d-8e081f262443', 'Philippe', 'Seither', 'phil@dynaprod.com', '+33 6 21 16 15 50', NULL, '2025-07-22 18:45:50.871094+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('e5e9f213-7911-4fa5-a02c-f8bdd0815eed', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Benjamin', 'Virgel', 'nebar81@gmail.com', '+33 6 17 93 72 04', NULL, '2025-06-23 07:45:27.086004+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('e93d2129-ae18-48e8-aeea-e30de5d7117d', 'bdae4b99-7e75-43e9-b7d2-b218fa3efd46', 'Solstice', 'Denervaud', 'solstice@ishtarmusic.com', '+41792138351', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756726598760.jpg', '2025-09-01 11:36:40.706164+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('ea7994fc-5899-4579-9e67-71fcddbe137a', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Maxime', 'Le Gall', 'maximehascoetlegall@gmail.com', '+33 (0)6 95 69 53 66', NULL, '2025-06-23 13:50:02.873711+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('ed3a7f17-784c-4844-b9b9-ed1411271a7c', '06a72523-01fb-44cb-9aeb-11328dfdbf34', 'Laurence', 'Margot', 'laurence@ousson.com', '+336.27.13.12.96', NULL, '2025-07-03 10:17:53.028957+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('f3c3e358-d925-46c8-bae0-092d6a4e663b', '2d5cc57e-dd20-401f-9d07-6fe18464f26b', 'luc', 'ryser', 'info@rysergroupe.ch', NULL, NULL, '2025-09-17 09:08:49.44563+00', '2025-09-17 09:08:49.44563+00', false, false),
  ('f5c919e2-93a2-4dc5-ab93-5b0c8f1dd06d', '505ca7b7-0aec-4175-a80c-4dae54454666', 'Lola', 'Nada', 'lola@inouie.ch', '+41766164213', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725228467.jpg', '2025-09-01 11:13:51.720249+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('f8ff4458-1084-4cad-a539-2fd459b08eb1', 'e6f60f62-1e8a-4d92-947d-ce6943f43628', 'Corinne', 'Taiana', 'corinne.taiana@umusic.com', '+41 78 614 94 94', 'https://oqqphvcylcsxgxbtvwau.supabase.co/storage/v1/object/public/contact-photos/temp-1756725754791.jpg', '2025-07-06 09:54:49.353325+00', '2025-09-16 10:36:17.014341+00', false, false),
  ('fdbdfe89-0c46-45da-959d-e8190327824f', '151872d6-2acb-4283-bdc0-43e76026a76a', 'Caro', 'Teriipaia', 'caro@bleucitron.net', '+33 (0)6 18 92 35 49', NULL, '2025-06-23 07:53:24.622581+00', '2025-09-16 10:36:17.014341+00', false, false)
ON CONFLICT (id) DO NOTHING;

-- Réactiver les triggers
SET session_replication_role = DEFAULT;

-- Afficher un résumé de l'import
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.crm_contacts;
  RAISE NOTICE '✅ Import terminé: % contacts dans crm_contacts', v_count;
END $$;













