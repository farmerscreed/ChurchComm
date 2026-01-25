-- Add total_recipients column to calling_campaigns table
-- This tracks the total number of recipients for a campaign

ALTER TABLE calling_campaigns
ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;

COMMENT ON COLUMN calling_campaigns.total_recipients IS 'Total number of recipients in this campaign';
