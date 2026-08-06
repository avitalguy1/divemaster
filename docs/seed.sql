-- ============================================================
-- Requirement catalog seed — PADI Divemaster
-- Source: Product 10147 (Rev 9/10) v3 + Product 10150 (9/10) v3
-- ============================================================

INSERT INTO requirement_sections (code, title, sort_order) VALUES
  ('PREREQ',        'Prerequisites and Administration',      1),
  ('CERT_REQ',      'Certification Requirements',            2),
  ('KNOWLEDGE',     'Knowledge Development',                 3),
  ('WATERSKILLS',   'Waterskills Exercises',                 4),
  ('SKILLS_WS',     'Diver Skills Workshop',                 5),
  ('PRACTICAL',     'Practical Application',                 6),
  ('DM_PROGRAMS',   'Divemaster-Conducted Programs Workshops', 7),
  ('ASSESSMENTS',   'Practical Assessments',                 8),
  ('PROFESSIONAL',  'Professionalism',                       9);

-- ---------- 1. Prerequisites and Administration ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, is_active, sort_order)
SELECT s.id, v.code, v.title, 'NONE', 'VERIFICATION', 1, v.active, v.ord
FROM requirement_sections s, (VALUES
  ('PRE_AGE',        '18 years or older',                                    TRUE,  1),
  ('PRE_AOW',        'Advanced Open Water or qualifying diver certification', TRUE,  2),
  ('PRE_RESCUE',     'Rescue Diver or qualifying diver certification',        TRUE,  3),
  ('PRE_MEDICAL',    'Medical Statement and physician''s approval',           TRUE,  4),
  ('PRE_EFR',        'EFR Primary and Secondary Care training or qualifying training', TRUE, 5),
  ('PRE_SOU',        'Statement of Understanding',                           TRUE,  6),
  ('PRE_RELEASE',    'Liability Release (Statement of Risks - EU)',           TRUE,  7),
  ('PRE_40_DIVES',   '40 logged dives',                                      TRUE,  8),
  ('PRE_FEES',       'Course fees paid',                                     TRUE,  9),
  ('PRE_PHOTOS',     'Two photos received',                                  FALSE, 10)
) AS v(code, title, active, ord)
WHERE s.code = 'PREREQ';

-- ---------- 2. Certification Requirements ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, sort_order)
SELECT s.id, v.code, v.title, 'NONE', 'VERIFICATION', 1, v.ord
FROM requirement_sections s, (VALUES
  ('CR_60_DIVES', '60 logged dives',                                              1),
  ('CR_EFR_24M',  'EFR Primary and Secondary Care training (current within 24 months)', 2),
  ('CR_MLA',      'Read and agreed to the PADI Membership and License Agreement',  3)
) AS v(code, title, ord)
WHERE s.code = 'CERT_REQ';

-- ---------- 3. Knowledge Development ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, sort_order)
SELECT s.id, v.code, v.title, 'NONE', 'VERIFICATION', 1, v.ord
FROM requirement_sections s, (VALUES
  ('KD_EAP', 'Emergency Assistance Plan',                                        1),
  ('KD_KR1', 'Knowledge Review 1 - The Role and Characteristics of a PADI Divemaster', 2),
  ('KD_KR2', 'Knowledge Review 2 - Supervising Diving Activities',               3),
  ('KD_KR3', 'Knowledge Review 3 - Assisting with Student Divers',               4),
  ('KD_KR4', 'Knowledge Review 4 - Diving Safety and Risk Management',           5),
  ('KD_KR5', 'Knowledge Review 5 - Divemaster-Conducted Programs',               6),
  ('KD_KR6', 'Knowledge Review 6 - Specialized Skills and Activities',           7),
  ('KD_KR7', 'Knowledge Review 7 - The Business of Diving and Your Career',      8),
  ('KD_KR8', 'Knowledge Review 8 - Awareness of the Dive Environment',           9),
  ('KD_KR9', 'Knowledge Review 9 - Dive Theory Review',                         10)
) AS v(code, title, ord)
WHERE s.code = 'KNOWLEDGE';

INSERT INTO requirement_items (section_id, code, title, description, scoring, evidence, required_count, sort_order)
SELECT id, 'KD_FINAL_EXAM', 'Final Exam',
       'Part 1 and Part 2 scores, OR Dive Theory Online completion',
       'EXAM', 'VERIFICATION', 1, 11
FROM requirement_sections WHERE code = 'KNOWLEDGE';

-- ---------- 4. Waterskills Exercises ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, min_score, sort_order)
SELECT s.id, v.code, v.title, 'SCORE_1_5', 'PERFORMANCE', 1, 1, v.ord
FROM requirement_sections s, (VALUES
  ('WS_EX1', 'Exercise 1 - 400 metre/yard swim',         1),
  ('WS_EX2', 'Exercise 2 - 15 minute float/tread',       2),
  ('WS_EX3', 'Exercise 3 - 800 metre/yard snorkel swim', 3),
  ('WS_EX4', 'Exercise 4 - 100 metre/yard diver tow',    4),
  ('WS_EX5', 'Exercise 5 - Equipment Exchange',          5)
) AS v(code, title, ord)
WHERE s.code = 'WATERSKILLS';

INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, sort_order)
SELECT id, 'WS_RESCUE', 'Diver Rescue (Exercise 7)', 'NONE', 'PERFORMANCE', 1, 6
FROM requirement_sections WHERE code = 'WATERSKILLS';

-- rule: waterskills total >= 15
INSERT INTO requirement_rules (section_id, rule_type, threshold, message)
SELECT id, 'MIN_TOTAL', 15, 'Waterskills Exercises 1-5 must total at least 15 points'
FROM requirement_sections WHERE code = 'WATERSKILLS';

-- ---------- 5. Diver Skills Workshop (24-skill score sheet) ----------
INSERT INTO requirement_items (section_id, code, title, description, scoring, evidence, required_count, min_score, sort_order)
SELECT id, 'SW_SCORE_SHEET', 'Divemaster Skill Development Score Sheet',
       'Demonstrate all scuba and skin diving skills, scoring at least 3 on each skill, at least 82 points total, with at least one underwater skill at 5.',
       'SCORE_SHEET', 'PERFORMANCE', 1, 3, 1
FROM requirement_sections WHERE code = 'SKILLS_WS';

INSERT INTO score_sheet_lines (item_id, line_number, label, is_underwater, counts_toward_total, min_score)
SELECT ri.id, v.n, v.label, v.uw, v.counts, 3
FROM requirement_items ri, (VALUES
  ( 1, 'Equipment assembly, adjustment, preparation, donning and disassembly', FALSE, TRUE),
  ( 2, 'Predive safety check (BWRAF)',                                          FALSE, TRUE),
  ( 3, 'Deep-water entry',                                                      FALSE, TRUE),
  ( 4, 'Buoyancy check at surface',                                             FALSE, TRUE),
  ( 5, 'Snorkel-regulator/regulator-snorkel exchange',                          FALSE, TRUE),
  ( 6, 'Five-point descent',                                                    FALSE, TRUE),
  ( 7, 'Regulator recovery and clearing',                                       TRUE,  TRUE),
  ( 8, 'Mask removal, replacement and clearing',                                TRUE,  TRUE),
  ( 9, 'Air depletion exercise and alternate air source use (stationary)',      TRUE,  TRUE),
  (10, 'Alternate air source-assisted ascent',                                  TRUE,  TRUE),
  (11, 'Free-flowing regulator breathing',                                      TRUE,  TRUE),
  (12, 'Neutral buoyancy',                                                      TRUE,  TRUE),
  (13, 'Five-point ascent',                                                     TRUE,  TRUE),
  (14, 'Controlled Emergency Swimming Ascent',                                  TRUE,  TRUE),
  (15, 'Hover motionless for 30 seconds',                                       TRUE,  TRUE),
  (16, 'Underwater swim without a mask',                                        TRUE,  TRUE),
  (17, 'Remove and replace weight system underwater',                           TRUE,  TRUE),
  (18, 'Remove and replace scuba unit underwater',                              TRUE,  TRUE),
  (19, 'Remove and replace scuba unit on the surface',                          FALSE, TRUE),
  (20, 'Remove and replace weight system on the surface',                       FALSE, TRUE),
  (21, 'Following relaxed breathing at the surface, remove the snorkel from the mouth, hold the breath and make a vertical, head first dive in water too deep in which to stand', FALSE, TRUE),
  (22, 'Disconnect a low-pressure inflator',                                    TRUE,  TRUE),
  (23, 'Re-secure a loose cylinder band',                                       TRUE,  TRUE),
  (24, 'Perform an emergency weight drop',                                      FALSE, FALSE)
) AS v(n, label, uw, counts)
WHERE ri.code = 'SW_SCORE_SHEET';

INSERT INTO requirement_rules (item_id, rule_type, threshold, message)
SELECT id, 'MIN_TOTAL', 82, 'Skills 1-23 must total at least 82 points' FROM requirement_items WHERE code = 'SW_SCORE_SHEET'
UNION ALL
SELECT id, 'MIN_PER_LINE', 3, 'Every skill must score at least 3' FROM requirement_items WHERE code = 'SW_SCORE_SHEET'
UNION ALL
SELECT id, 'MIN_ONE_UNDERWATER_5', 5, 'At least one underwater skill must score 5' FROM requirement_items WHERE code = 'SW_SCORE_SHEET';

-- ---------- 6. Practical Application ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, alternative_note, sort_order)
SELECT s.id, v.code, v.title, 'NONE', 'PERFORMANCE', v.cnt, v.alt, v.ord
FROM requirement_sections s, (VALUES
  ('PA_SKILL1', 'Skill 1 - Dive Site Set Up and Management', 3, NULL,                                              1),
  ('PA_SKILL2', 'Skill 2 - Mapping Project',                 1, NULL,                                              2),
  ('PA_SKILL3', 'Skill 3 - Dive Briefing',                   2, NULL,                                              3),
  ('PA_SKILL4', 'Skill 4 - Search and Recovery Scenario',     1, 'OR PADI Search and Recovery Diver specialty certification', 4),
  ('PA_SKILL5', 'Skill 5 - Deep Dive Scenario',               1, 'OR PADI Deep Diver specialty certification',      5)
) AS v(code, title, cnt, alt, ord)
WHERE s.code = 'PRACTICAL';

-- ---------- 7. Divemaster-Conducted Programs Workshops ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, sort_order)
SELECT s.id, v.code, v.title, 'NONE', 'PERFORMANCE', v.cnt, v.ord
FROM requirement_sections s, (VALUES
  ('WK_1', 'Workshop 1 - ReActivate',                                 1, 1),
  ('WK_2', 'Workshop 2 - Advanced Snorkeling',                        1, 2),
  ('WK_3', 'Workshop 3 - DSD Program in Confined Water',              1, 3),
  ('WK_4', 'Workshop 4 - DSD Program - Additional Open Water Dive',   1, 4),
  ('WK_5', 'Workshop 5 - Discover Local Diving in Open Water',        2, 5)
) AS v(code, title, cnt, ord)
WHERE s.code = 'DM_PROGRAMS';

-- ---------- 8. Practical Assessments (all X2) ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, sort_order)
SELECT s.id, v.code, v.title, 'NONE', 'PERFORMANCE', 2, v.ord
FROM requirement_sections s, (VALUES
  ('AS_1', 'Practical Assessment 1 - Open Water Diver Students in Confined Water',        1),
  ('AS_2', 'Practical Assessment 2 - Open Water Diver Students in Open Water',            2),
  ('AS_3', 'Practical Assessment 3 - Continuing Education Student Divers in Open Water',  3),
  ('AS_4', 'Practical Assessment 4 - Certified Divers in Open Water',                     4)
) AS v(code, title, ord)
WHERE s.code = 'ASSESSMENTS';

-- ---------- 9. Professionalism ----------
INSERT INTO requirement_items (section_id, code, title, scoring, evidence, required_count, min_score, sort_order)
SELECT id, 'PROF_EVAL', 'Professionalism Evaluation', 'SCORE_SHEET', 'PERFORMANCE', 1, 3, 1
FROM requirement_sections WHERE code = 'PROFESSIONAL';

INSERT INTO score_sheet_lines (item_id, line_number, label, is_underwater, counts_toward_total, min_score)
SELECT ri.id, v.n, v.label, FALSE, TRUE, 3
FROM requirement_items ri, (VALUES
  (1, 'Level of active, positive participation in the training sessions'),
  (2, 'Ability to serve as a mentor to student divers'),
  (3, 'Willingness to follow directions'),
  (4, 'Positive attitude and demeanor toward student divers, divers and staff'),
  (5, 'Positive attitude and practice towards caring for the environment'),
  (6, 'General understanding of a divemaster''s role'),
  (7, 'Appearance')
) AS v(n, label)
WHERE ri.code = 'PROF_EVAL';

-- ---------- logged-dive rules ----------
INSERT INTO requirement_rules (item_id, rule_type, threshold, message)
SELECT id, 'MIN_LOGGED_DIVES', 40, 'Student must have at least 40 logged dives' FROM requirement_items WHERE code = 'PRE_40_DIVES'
UNION ALL
SELECT id, 'MIN_LOGGED_DIVES', 60, 'Student must have at least 60 logged dives' FROM requirement_items WHERE code = 'CR_60_DIVES';
