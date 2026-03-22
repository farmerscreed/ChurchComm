-- Migration: Update church_memories table for Epic 6 compatibility
-- Epic 6: AI & Memory Enhancements - Task 6.3a

-- Add organization_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'church_memories' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE church_memories ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'church_memories' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE church_memories ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create index on organization_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_church_memories_org ON church_memories(organization_id);

-- Enable RLS if not already enabled
ALTER TABLE church_memories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Org members can view church memories" ON church_memories;
DROP POLICY IF EXISTS "Admin and pastor can manage church memories" ON church_memories;

-- RLS Policy: org members can view
CREATE POLICY "Org members can view church memories"
  ON church_memories FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- RLS Policy: admin/pastor can manage
CREATE POLICY "Admin and pastor can manage church memories"
  ON church_memories FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'pastor')
  ));

-- Update match_church_memories function to filter by organization
CREATE OR REPLACE FUNCTION match_church_memories (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_organization_id UUID DEFAULT NULL
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  organization_id UUID
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.content,
    cm.metadata,
    1 - (cm.embedding <=> query_embedding) AS similarity,
    cm.organization_id
  FROM church_memories cm
  WHERE 1 - (cm.embedding <=> query_embedding) > match_threshold
    AND (p_organization_id IS NULL OR cm.organization_id = p_organization_id)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON TABLE church_memories IS 'Stores church-wide context like events, announcements, and sermon series for AI calls.';
COMMENT ON COLUMN church_memories.organization_id IS 'References the organization this memory belongs to.';
