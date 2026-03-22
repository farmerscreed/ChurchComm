-- Migration: Add get_recent_member_memories function for recency-based retrieval
-- Epic 6: AI & Memory Enhancements - Task 6.1

-- Create helper function to get recent memories without embedding query
CREATE OR REPLACE FUNCTION get_recent_member_memories(
  p_person_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  created_at TIMESTAMPTZ
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

COMMENT ON FUNCTION get_recent_member_memories IS 'Retrieves the most recent memories for a person without requiring embedding query. Used for recency-based context in AI calls.';
