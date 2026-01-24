import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const APP_URL = 'https://church.lawonecloud.com'

// Note: This function should be triggered by a Supabase Database Webhook
// on INSERT to the `follow_ups` table.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Received followup notification payload:', payload);

    const followUp = payload.record;

    if (payload.type !== 'INSERT' || !followUp) {
      return new Response(JSON.stringify({ message: 'Not an insert event or no record found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { organization_id, person_id, priority, status, reason } = followUp;

    if (!organization_id || !person_id) {
        throw new Error('Missing organization_id or person_id in the follow-up record.');
    }

    // Use the Service Role Key for admin-level access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    // 1. Get organization settings to find notification recipients
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, settings')
      .eq('id', organization_id)
      .single();

    if (orgError) throw new Error(`Could not fetch organization: ${orgError.message}`);

    const recipients = org.settings?.notifications?.follow_up_recipients;
    if (!recipients || recipients.length === 0) {
      console.log('No notification recipients configured for this organization.');
      return new Response(JSON.stringify({ message: 'No recipients configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Get the person's details for the email
    const { data: person, error: personError } = await supabaseAdmin
        .from('people')
        .select('first_name, last_name')
        .eq('id', person_id)
        .single();

    if (personError) console.warn(`Could not fetch person details: ${personError.message}`);
    const personName = `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'An individual';

    // 3. Get the email addresses of the recipients
    const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .in('id', recipients);

    if (profilesError) throw new Error(`Could not fetch recipient profiles: ${profilesError.message}`);

    const recipientEmails = profiles.map(p => p.email).filter(email => email);

    if (recipientEmails.length === 0) {
        console.log('Recipient user IDs found, but no corresponding emails.');
        return new Response(JSON.stringify({ message: 'No recipient emails found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
    }

    // 4. Send email to each recipient using Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured. Cannot send notification emails.');
      return new Response(JSON.stringify({
        success: false,
        message: 'Email service not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const followUpUrl = `${APP_URL}/follow-ups`;
    const priorityColor = priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#f59e0b' : '#3b82f6';
    const priorityLabel = priority.toUpperCase();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Follow-up Task</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Follow-up Task</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            A new follow-up task has been created and requires your attention.
          </p>

          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 100px;">Person:</td>
                <td style="padding: 8px 0;">${personName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                <td style="padding: 8px 0;">
                  <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    ${priorityLabel}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0; text-transform: capitalize;">${status}</td>
              </tr>
              ${reason ? `<tr>
                <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Reason:</td>
                <td style="padding: 8px 0; background: #fef3c7; border-radius: 4px; padding: 8px;">${reason}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Organization:</td>
                <td style="padding: 8px 0;">${org.name}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${followUpUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              View Follow-ups
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            ChurchConnect - Keeping Churches Connected
          </p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
New Follow-up Task

A new follow-up task has been created and requires your attention.

Person: ${personName}
Priority: ${priorityLabel}
Status: ${status}${reason ? `
Reason: ${reason}` : ''}
Organization: ${org.name}

View the follow-up pipeline: ${followUpUrl}

---
ChurchConnect - Keeping Churches Connected
    `.trim();

    const subject = `[${priorityLabel}] New Follow-up: ${personName}`;

    // Send to all recipients
    const sendResults = await Promise.allSettled(
      recipientEmails.map(async (email) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'ChurchConnect <noreply@church.lawonecloud.com>',
            to: email,
            subject: subject,
            html: emailHtml,
            text: emailText
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send email to ${email}:`, errorText);
          throw new Error(`Failed to send to ${email}`);
        }

        console.log(`Successfully sent notification email to ${email}`);
        return email;
      })
    );

    const successful = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').length;

    console.log(`Email notifications: ${successful} sent, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      sent: successful,
      failed: failed,
      recipients: recipientEmails
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
