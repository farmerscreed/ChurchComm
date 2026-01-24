-- Migration 11: Create member_memories table with vector search

CREATE TABLE member_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768),
    memory_type TEXT NOT NULL CHECK (memory_type IN ('call_summary', 'prayer_request', 'personal_note', 'preference')),
    source_call_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ivfflat index on embedding column for similarity search
CREATE INDEX idx_member_memories_embedding
    ON member_memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Additional indexes for common query patterns
CREATE INDEX idx_member_memories_person
    ON member_memories(person_id);

CREATE INDEX idx_member_memories_org
    ON member_memories(organization_id);

CREATE INDEX idx_member_memories_type
    ON member_memories(person_id, memory_type);

-- Enable RLS
ALTER TABLE member_memories ENABLE ROW LEVEL SECURITY;

-- Policy: org members can SELECT
CREATE POLICY "Org members can view member memories"
    ON member_memories FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = member_memories.organization_id
        AND user_id = auth.uid()
    ));

-- Policy: org members can INSERT (calls create memories)
CREATE POLICY "Org members can create member memories"
    ON member_memories FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = member_memories.organization_id
        AND user_id = auth.uid()
    ));

-- Create the match_member_memories function for semantic search
CREATE OR REPLACE FUNCTION match_member_memories(
    p_person_id UUID,
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    memory_type TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mm.id,
        mm.content,
        mm.memory_type,
        (1 - (mm.embedding <=> query_embedding))::FLOAT AS similarity,
        mm.created_at
    FROM member_memories mm
    WHERE mm.person_id = p_person_id
    AND 1 - (mm.embedding <=> query_embedding) > match_threshold
    ORDER BY mm.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comments
COMMENT ON TABLE member_memories IS 'Stores AI-generated memories about church members from calls, notes, and interactions.';
COMMENT ON COLUMN member_memories.embedding IS '768-dimensional vector embedding for semantic similarity search.';
COMMENT ON COLUMN member_memories.memory_type IS 'Category of memory: call_summary, prayer_request, personal_note, or preference.';
COMMENT ON COLUMN member_memories.source_call_id IS 'Reference to the call that generated this memory (if applicable).';
COMMENT ON FUNCTION match_member_memories IS 'Semantic search across member memories using vector similarity.';
