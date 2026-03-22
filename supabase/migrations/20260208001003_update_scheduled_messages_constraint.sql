-- Migration to update scheduled_messages check constraint to include 'call'
ALTER TABLE scheduled_messages DROP CONSTRAINT IF EXISTS scheduled_messages_message_type_check;

ALTER TABLE scheduled_messages 
ADD CONSTRAINT scheduled_messages_message_type_check 
CHECK (message_type IN ('sms', 'email', 'call'));
