-- Add parentId column to evaluation_comments table for reply functionality
ALTER TABLE "evaluation_comments" ADD COLUMN "parentId" TEXT;

-- Add foreign key constraint for self-referential relationship
ALTER TABLE "evaluation_comments" ADD CONSTRAINT "evaluation_comments_parentId_fkey" 
FOREIGN KEY ("parentId") REFERENCES "evaluation_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for better performance on parentId queries
CREATE INDEX "evaluation_comments_parentId_idx" ON "evaluation_comments"("parentId");