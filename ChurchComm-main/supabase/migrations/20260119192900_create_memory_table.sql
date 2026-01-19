-- Create a table for storing unorganized notes/memories
CREATE TABLE IF NOT EXISTS church_memories (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,          -- The actual note (e.g., "Pastor Sam's email is...")
  metadata JSONB DEFAULT '{}',    -- Extra info (e.g., { "category": "contact", "importance": "high" })
  embedding VECTOR(1536)          -- The "brain" part (1536 dimensions for OpenAI/Gemini models)
);

-- Add an index to make searches fast as the memory grows
CREATE INDEX ON church_memories USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_church_memories (
  query_embedding VECTOR(1536),
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
