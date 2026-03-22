-- Migration 3: Add 'pastor' role support
-- Adds CHECK constraint on organization_members.role to enforce valid values
-- Updates invitations.role CHECK to include 'pastor'

-- Step 1: Add CHECK constraint on organization_members.role
-- First drop any existing check constraint on role
ALTER TABLE organization_members
    DROP CONSTRAINT IF EXISTS organization_members_role_check;

-- Add new CHECK constraint allowing admin, pastor, member
ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('admin', 'pastor', 'member'));

-- Step 2: Update invitations.role CHECK to include 'pastor'
-- Drop the existing check constraint
ALTER TABLE invitations
    DROP CONSTRAINT IF EXISTS invitations_role_check;

-- Add new CHECK constraint with pastor included
ALTER TABLE invitations
    ADD CONSTRAINT invitations_role_check
    CHECK (role IN ('admin', 'pastor', 'leader', 'member'));
