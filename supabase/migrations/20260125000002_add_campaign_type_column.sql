-- Add campaign_type column to calling_campaigns table
-- This makes campaigns self-describing so we can distinguish voice campaigns from others

ALTER TABLE calling_campaigns
ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(20) DEFAULT 'voice' CHECK (campaign_type IN ('voice', 'outbound_call', 'inbound_call'));

-- Update existing campaigns to have campaign_type = 'voice'
UPDATE calling_campaigns SET campaign_type = 'voice' WHERE campaign_type IS NULL;

-- Make campaign_type NOT NULL after setting defaults
ALTER TABLE calling_campaigns
ALTER COLUMN campaign_type SET NOT NULL;

COMMENT ON COLUMN calling_campaigns.campaign_type IS 'Type of campaign: voice (AI calling), outbound_call (manual), or inbound_call (inbound tracking)';
