-- Create enum for member status
CREATE TYPE status_enum AS ENUM (
  'first_time_visitor',
  'regular_visitor',
  'member',
  'leader',
  'inactive'
);

-- Create people table
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  address JSONB,
  birthday DATE,
  member_status status_enum DEFAULT 'first_time_visitor',
  tags TEXT[],
  communication_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (using organization_members instead of user_roles)
CREATE POLICY "Users can view people in their organization"
  ON people FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create people in their organization"
  ON people FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update people in their organization"
  ON people FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete people in their organization"
  ON people FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_people_organization ON people(organization_id);
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_phone ON people(phone_number);
CREATE INDEX idx_people_member_status ON people(member_status);
CREATE INDEX idx_people_tags ON people USING GIN (tags);
