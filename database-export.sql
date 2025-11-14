-- ========================================
-- DATABASE EXPORT - Financial Planner App
-- Generated: 2025-11-14
-- ========================================

-- IMPORTANT NOTES:
-- 1. Run this script AFTER creating all tables with migrations
-- 2. Make sure user_id values exist in auth.users table
-- 3. UUID values are preserved from original database
-- 4. Execute in order to maintain foreign key relationships

-- ========================================
-- 1. PROFILES
-- ========================================

INSERT INTO public.profiles (id, full_name, avatar_url, created_at, updated_at) VALUES
('8c3c02e9-1645-4045-806e-b82cc590f01c', 'nabila arifiana', NULL, '2025-11-06 16:08:22.428058+00', '2025-11-06 16:08:22.428058+00'),
('0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'DARIS FAROSTIAN', NULL, '2025-11-09 17:29:41.434915+00', '2025-11-09 17:29:41.434915+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. USER ROLES
-- ========================================

INSERT INTO public.user_roles (id, user_id, role, created_by, created_at) VALUES
('9eb096e6-b416-4ebb-ba83-20aba410d272', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'super_admin', NULL, '2025-11-09 17:30:23.906709+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 3. BANK ACCOUNTS
-- ========================================

INSERT INTO public.bank_accounts (id, user_id, bank_name, account_number, account_holder_name, account_type, balance, is_active, notes, created_at, updated_at) VALUES
('071ee1da-da29-4169-ad7a-2abe8225b4f9', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'BCA', '7445130885', 'Daris Farostian', 'checking', 0, true, '', '2025-11-10 10:44:39.287872+00', '2025-11-10 10:48:37.563471+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. CLIENT GROUPS
-- ========================================

INSERT INTO public.client_groups (id, user_id, nama, nomor_telepon, ktp_files, has_whatsapp, whatsapp_checked_at, created_at, updated_at) VALUES
('461aa0df-61c7-4c87-89ec-1308374415de', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '🐋 Lawang Bhuana', '08123456789', '[]', true, '2025-11-12 10:05:15.384+00', '2025-11-11 14:15:01.267605+00', '2025-11-12 10:05:16.238906+00'),
('201fa77d-d0d4-478f-a7f0-8cf564a67f63', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '🦋 Nabila', '085433378888', '[]', true, '2025-11-12 10:07:30.881+00', '2025-11-11 15:51:54.024944+00', '2025-11-12 10:07:31.316733+00'),
('7549cbef-7ee7-4e06-95aa-98170c8d4722', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'Rachel Venna', '082339586673', '[]', true, '2025-11-12 13:29:17.172+00', '2025-11-12 12:57:27.72954+00', '2025-11-12 13:29:17.475622+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. RENTAL CONTRACTS (Sample - first 3 contracts)
-- ========================================
-- Note: This table has many records. Showing first 3 as example.
-- For full export, refer to the database directly.

INSERT INTO public.rental_contracts (
  id, user_id, client_group_id, bank_account_id, invoice, 
  jumlah_lunas, tagihan_belum_bayar, tanggal, tanggal_lunas, 
  start_date, end_date, status, keterangan, notes, 
  google_maps_link, bukti_pembayaran_files, created_at, updated_at
) VALUES
('47d1ff2b-e2b8-4bf8-9112-d287dc4e5ba1', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '461aa0df-61c7-4c87-89ec-1308374415de', '071ee1da-da29-4169-ad7a-2abe8225b4f9', '000178', 7000000, 7000000, '2025-11-01', '2025-12-10', '2025-11-03', '2025-12-03', 'masa sewa', 'Proyek kertodirjo mas daris kloter 2', NULL, NULL, '[]', '2025-11-11 14:16:33.712403+00', '2025-11-13 14:52:49.332257+00'),
('b73c7825-82d8-4c55-b7f5-2108a6d0aef5', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '461aa0df-61c7-4c87-89ec-1308374415de', '071ee1da-da29-4169-ad7a-2abe8225b4f9', '000174 ', 12000000, 12000000, '2025-11-01', '2025-12-10', '2025-11-01', '2025-11-09', 'berulang', 'Proyek kertodirjo no.3 mas farostian', 'Mas daris maem bakso', NULL, '[]', '2025-11-11 14:48:58.18943+00', '2025-11-13 14:51:50.001013+00'),
('65745497-87c3-4001-bb2c-8903bfe57c5c', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '461aa0df-61c7-4c87-89ec-1308374415de', '071ee1da-da29-4169-ad7a-2abe8225b4f9', '000176', 78000000, 78000000, '2025-11-11', '2025-12-20', '2025-11-12', '2025-12-17', 'perpanjangan', 'Mas daris membeli rumah nomor tiga dan membeli masjid sunan kalijaga', 'Mas daris halusinasi', NULL, '[]', '2025-11-11 15:09:21.853547+00', '2025-11-13 14:51:15.097793+00')
ON CONFLICT (id) DO NOTHING;

-- Additional rental contracts exist in database but truncated for brevity

-- ========================================
-- 6. INCOME SOURCES
-- ========================================

INSERT INTO public.income_sources (id, user_id, source_name, amount, bank_name, date, contract_id, created_at, updated_at) VALUES
('159db7b4-c5a4-4665-8202-c60d07ea60b6', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '000119 - 🦋 Nabila', 20000000.00, 'BCA', '2025-12-14', 'dca6bdbe-e2e7-4126-a796-3cff0fbd9a51', '2025-11-13 14:30:00.373136+00', '2025-11-13 15:17:43.248018+00'),
('28442e87-fa3c-4f00-8656-330973b2a798', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '000176 - 🐋 Lawang Bhuana', 78000000.00, 'BCA', '2025-12-20', '65745497-87c3-4001-bb2c-8903bfe57c5c', '2025-11-13 15:12:53.64311+00', '2025-11-13 15:12:53.64311+00'),
('f3c90628-fd72-4072-88ad-7375113b2eed', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '000174  - 🐋 Lawang Bhuana', 12000000.00, 'BCA', '2025-12-10', 'b73c7825-82d8-4c55-b7f5-2108a6d0aef5', '2025-11-13 15:12:53.64311+00', '2025-11-13 15:12:53.64311+00'),
('03ad8507-6445-4d8a-bea6-5dfcdfe5995f', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '000178 - 🐋 Lawang Bhuana', 7000000.00, 'BCA', '2025-12-10', '47d1ff2b-e2b8-4bf8-9112-d287dc4e5ba1', '2025-11-13 15:12:53.64311+00', '2025-11-13 15:12:53.64311+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 7. EXPENSES
-- ========================================

INSERT INTO public.expenses (id, user_id, category, sub_category, amount, date, description, is_fixed, created_at, updated_at) VALUES
('ef28d990-c934-4dca-a3b5-7ac5ef14e875', '8c3c02e9-1645-4045-806e-b82cc590f01c', 'Tak Terduga (Unexpected)', 'beli rok mini', 150000.00, '2025-11-09', NULL, false, '2025-11-09 15:45:05.597683+00', '2025-11-09 15:45:05.597683+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 8. MONTHLY REPORTS
-- ========================================

INSERT INTO public.monthly_reports (id, user_id, month, year, pemasukan, pengeluaran, pengeluaran_tetap, target_belanja, target_keuangan, sisa_tabungan, created_at, updated_at) VALUES
('fdeada44-d1d8-46c7-9c75-9457e55282ca', '8c3c02e9-1645-4045-806e-b82cc590f01c', 'november', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-09 15:34:02.905277+00', '2025-11-09 15:34:02.905277+00'),
('832874ca-317d-4b11-9494-6c6029e426a1', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'oktober', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-10 02:56:49.729822+00', '2025-11-10 02:56:49.729822+00'),
('5c5e8c15-2d31-4145-86c3-0b41b2a76df9', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'juni', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-10 10:30:17.566118+00', '2025-11-10 10:30:17.566118+00'),
('ae0f1045-0ce6-4b36-90d3-7049bdb18891', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'november', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-11 12:43:17.608817+00', '2025-11-11 12:43:17.608817+00'),
('38741267-0cfc-4fe0-9607-7ecddc21ca88', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'januari', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-12 14:25:39.916764+00', '2025-11-12 14:25:39.916764+00'),
('13d61a13-1745-4053-8bf7-5ca5a3fbf30e', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'februari', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-12 14:28:39.958928+00', '2025-11-12 14:28:39.958928+00'),
('aef0c4e4-61c4-46b7-8758-c2735f83dd84', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'desember', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-12 14:29:09.893682+00', '2025-11-12 14:29:09.893682+00'),
('f316400c-5fd3-46ee-ab80-376baa8e955f', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'mei', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-12 15:02:34.159645+00', '2025-11-12 15:02:34.159645+00'),
('4cf3d3e0-21e0-4381-b232-b71c3b635bd0', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'september', 2025, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '2025-11-12 16:16:25.792629+00', '2025-11-12 16:16:25.792629+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 9. USER AI SETTINGS
-- ========================================

INSERT INTO public.user_ai_settings (id, user_id, ai_provider, api_key, is_active, created_at, updated_at) VALUES
('d400ccb5-ddc3-412a-8f9a-01b5d2a07145', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'deepseek', 'sk-474da3706b4b42828ed4108d5ddf87d7', true, '2025-11-12 09:56:58.26654+00', '2025-11-13 16:37:50.601057+00'),
('9feb1883-9461-4b10-b846-b724f4ea15f8', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', 'claude', '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', false, '2025-11-13 16:37:44.148973+00', '2025-11-13 16:37:50.332339+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 10. EDITABLE CONTENT (Sample - first 5 entries)
-- ========================================
-- Note: This table has many records. Showing sample.

INSERT INTO public.editable_content (id, content_key, content_value, page, category, created_by, updated_by, created_at, updated_at) VALUES
('a9edf6a3-1f00-470f-bb74-bd177a67f123', '/::div#root>div[1]>div[0]>main[0]>div[0]>div[1]>div[0]>div[0]>div[1]>h3[0]', 'Nabila Financial Planner', '/', 'auto', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '2025-11-10 02:19:47.695688+00', '2025-11-10 02:19:46.541+00'),
('573deccb-4473-4912-b83e-7359c9c75a5d', '/dashboard::div#root>div[1]>div[0]>main[0]>div[0]>div[0]', 'Financial DashboardRingkasan keuangan Anda bulan iniLihat Detail →', '/dashboard', 'auto', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '2025-11-10 02:19:53.720458+00', '2025-11-10 02:19:53.534+00')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- NOTES
-- ========================================
-- 1. The following tables had no data:
--    - monthly_budgets
--    - payments_tracking
--    - savings_plans
--    - savings_settings
--    - savings_transactions
--    - recurring_income
--    - recurring_transactions
--    - audit_logs
--
-- 2. Large tables (rental_contracts, editable_content, content_history, 
--    chat_conversations, chat_messages, ai_usage_analytics) have been 
--    truncated in this export. Full data available in database.
--
-- 3. To export complete data, use pg_dump:
--    pg_dump -h [host] -U [user] -d [database] --data-only --table=table_name
--
-- 4. Remember to update user_id references if importing to a different 
--    authentication system.
--
-- ========================================
-- END OF EXPORT
-- ========================================
