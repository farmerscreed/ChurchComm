---
description: Create member_memories table and matching function
epic: Epic 6 - AI & Memory Enhancements
task_id: 6.1
---

## Context
Create the database infrastructure for storing per-member conversation context.

## Prerequisites
- pgvector extension enabled (already in use)

## Implementation Steps

### 1. Create migration for member_memories table

Create `supabase/migrations/YYYYMMDDHHMMSS_create_member_memories.sql`:

```sql
-- Create member_memories table for per-person AI context
CREATE TABLE IF NOT EXISTS member_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  memory_type VARCHAR NOT NULL CHECK (memory_type IN ('call_summary', 'prayer_request', 'personal_note', 'preference')),
  source_call_id UUID REFERENCES call_attempts(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_memory_content CHECK (length(content) > 0)
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_member_memories_embedding 
  ON member_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index for person lookups
CREATE INDEX IF NOT EXISTS idx_member_memories_person 
  ON member_memories(person_id, created_at DESC);

-- Enable RLS
ALTER TABLE member_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view member memories"
  ON member_memories FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin and pastor can manage member memories"
  ON member_memories FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'pastor')
  ));
```

### 2. Create match_member_memories function

```sql
-- Function to find similar memories for a person
CREATE OR REPLACE FUNCTION match_member_memories(
  p_person_id UUID,
  p_query_embedding vector(768),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type VARCHAR,
  similarity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.memory_type,
    1 - (m.embedding <=> p_query_embedding) AS similarity,
    m.created_at
  FROM member_memories m
  WHERE m.person_id = p_person_id
    AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;
```

### 3. Create helper function for recent memories

```sql
-- Get recent memories for a person (no embedding needed)
CREATE OR REPLACE FUNCTION get_recent_member_memories(
  p_person_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.memory_type,
    m.created_at
  FROM member_memories m
  WHERE m.person_id = p_person_id
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;
```

## Verification
1. Run migration
2. Verify table created with correct columns
3. Test inserting a memory
4. Test match_member_memories function

```sql
-- Test insert
INSERT INTO member_memories (organization_id, person_id, content, memory_type)
VALUES ('org-uuid', 'person-uuid', 'Mentioned daughter is getting married', 'personal_note');

-- Test retrieval
SELECT * FROM get_recent_member_memories('person-uuid');
```

## On Completion
Update `activity.md` and mark task 6.1 as `[x]`
