-- Test Data Seeding Script
-- Use this for local development and testing

-- Clean existing test data (optional)
DELETE FROM user_match_status WHERE user_did LIKE 'did:plc:test%';
DELETE FROM atproto_matches WHERE source_account_id IN (SELECT id FROM source_accounts WHERE source_platform = 'test');
DELETE FROM user_source_follows WHERE user_did LIKE 'did:plc:test%';
DELETE FROM source_accounts WHERE source_platform = 'test';
DELETE FROM user_uploads WHERE upload_id LIKE 'test-%';
DELETE FROM user_sessions WHERE session_id LIKE 'test-%';

-- Test user session
INSERT INTO user_sessions (session_id, did, fingerprint, expires_at)
VALUES (
    'test-session-123',
    'did:plc:test',
    'test-fingerprint',
    NOW() + INTERVAL '7 days'
);

-- Test upload
INSERT INTO user_uploads (upload_id, user_did, source_platform, total_users, matched_users, unmatched_users)
VALUES (
    'test-upload-1',
    'did:plc:test',
    'instagram',
    10,
    5,
    5
);

-- Test source accounts
INSERT INTO source_accounts (source_platform, original_username, normalized_username)
VALUES
    ('instagram', 'test_user', 'testuser'),
    ('instagram', 'john.doe', 'johndoe'),
    ('instagram', 'jane_smith', 'janesmith'),
    ('tiktok', '@cool_person', 'coolperson'),
    ('twitter', 'example_account', 'exampleaccount')
ON CONFLICT (source_platform, normalized_username) DO NOTHING;

-- Link source accounts to upload
INSERT INTO user_source_follows (user_did, upload_id, source_account_id)
SELECT
    'did:plc:test',
    'test-upload-1',
    id
FROM source_accounts
WHERE source_platform IN ('instagram', 'tiktok', 'twitter')
    AND normalized_username IN ('testuser', 'johndoe', 'janesmith', 'coolperson', 'exampleaccount')
ON CONFLICT DO NOTHING;

-- Test AT Protocol matches
INSERT INTO atproto_matches (
    source_account_id,
    atproto_did,
    atproto_handle,
    display_name,
    match_score,
    post_count,
    follower_count,
    follow_status
)
SELECT
    sa.id,
    'did:plc:matched-' || sa.id,
    sa.normalized_username || '.bsky.social',
    INITCAP(REPLACE(sa.normalized_username, '_', ' ')),
    100,
    42,
    128,
    '{}'::jsonb
FROM source_accounts sa
WHERE sa.source_platform IN ('instagram', 'tiktok')
    AND sa.normalized_username IN ('testuser', 'johndoe')
ON CONFLICT (source_account_id, atproto_did) DO NOTHING;

-- Test user match status
INSERT INTO user_match_status (user_did, match_id, viewed, dismissed, followed, notified)
SELECT
    'did:plc:test',
    am.id,
    false,
    false,
    false,
    false
FROM atproto_matches am
WHERE am.atproto_did LIKE 'did:plc:matched-%'
ON CONFLICT DO NOTHING;

-- Display summary
SELECT 'Test data seeded successfully!' as message;
SELECT COUNT(*) as session_count FROM user_sessions WHERE session_id LIKE 'test-%';
SELECT COUNT(*) as upload_count FROM user_uploads WHERE upload_id LIKE 'test-%';
SELECT COUNT(*) as source_account_count FROM source_accounts WHERE source_platform IN ('test', 'instagram', 'tiktok', 'twitter');
SELECT COUNT(*) as match_count FROM atproto_matches WHERE atproto_did LIKE 'did:plc:matched-%';
