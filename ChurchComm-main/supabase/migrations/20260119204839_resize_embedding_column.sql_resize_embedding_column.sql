-- 1. Change the column size to 768
ALTER TABLE church_memories 
ALTER COLUMN embedding TYPE vector(768);

-- 2. Update the function to accept 768
CREATE OR REPLACE FUNCTION match_church_memories (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    church_memories.id,
    church_memories.content,
    church_memories.metadata,
    1 - (church_memories.embedding <=> query_embedding) AS similarity
  FROM church_memories
  WHERE 1 - (church_memories.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
