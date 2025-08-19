-- Migration script to fix corrupted voteDetails in evaluation_comments
-- Run this script to ensure all existing records have proper voteDetails structure

-- Fix all records with null, empty, or missing userVotes structure
UPDATE "evaluation_comments" 
SET "voteDetails" = '{"userVotes": {}}'::jsonb 
WHERE "voteDetails" IS NULL 
   OR "voteDetails" = '{}'::jsonb 
   OR NOT ("voteDetails" ? 'userVotes');

-- Verify the fix by checking affected records
SELECT 
    id, 
    "submissionId", 
    "categoryId", 
    "voteDetails"
FROM "evaluation_comments" 
WHERE "voteDetails" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;

-- Count of records that were fixed
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN "voteDetails" ? 'userVotes' THEN 1 END) as fixed_records
FROM "evaluation_comments";