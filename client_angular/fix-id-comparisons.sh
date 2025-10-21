#!/bin/bash
FILE="src/app/Services/evaluation/evaluation-state.service.ts"

# Fix ID comparisons - convert comment ID to string for comparison
sed -i 's/c\.id === commentId/String(c.id) === commentId/g' "$FILE"
sed -i 's/comment\.id !== commentId/String(comment.id) !== commentId/g' "$FILE"
sed -i 's/s\.id === currentSubmissionId/String(s.id) === currentSubmissionId/g' "$FILE"
sed -i 's/s\.id === submissionId/String(s.id) === submissionId/g' "$FILE"

echo "Applied ID comparison fixes to $FILE"
