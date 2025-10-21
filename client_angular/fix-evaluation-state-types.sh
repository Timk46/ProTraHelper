#!/bin/bash
FILE="src/app/Services/evaluation/evaluation-state.service.ts"

# Fix 1: getUserRatingStatus calls - convert submissionId to string
sed -i 's/getUserRatingStatus(submissionId, /getUserRatingStatus(String(submissionId), /g' "$FILE"

# Fix 2: loadVoteLimitStatus calls - convert submissionId to string  
sed -i 's/loadVoteLimitStatus(submissionId, /loadVoteLimitStatus(String(submissionId), /g' "$FILE"

# Fix 3: commentIdToCategoryIdMap.set - convert comment.id to string
sed -i 's/commentIdToCategoryIdMap\.set(comment\.id, /commentIdToCategoryIdMap.set(String(comment.id), /g' "$FILE"

# Fix 4: getDiscussionsForCategory - convert submission.id to string
sed -i 's/getDiscussionsForCategory(submission\.id, /getDiscussionsForCategory(String(submission.id), /g' "$FILE"

echo "Applied fixes to $FILE"
