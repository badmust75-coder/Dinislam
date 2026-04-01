-- Add Ayat Al-Kursi as a special sourate entry (verse 255 of Al-Baqara)
-- Placed between Al-Ikhlas (112) and Al-Masad (111) in display order
INSERT INTO sourates (number, name_arabic, name_french, verses_count, revelation_type, display_order, is_locked)
VALUES (1000, 'آية الكرسي', 'Ayat Al-Kursi (Le Verset du Trône)', 1, 'Médinoise', 1125, false)
ON CONFLICT (number) DO NOTHING;
