import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const APP_URL = 'https://church.lawonecloud.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      email,
      phoneNumber,
      role,
      inviteMethod,
      organizationId,
      organizationName,
      invitedBy,
      inviterName
    } = await req.json()

    console.log('Received invite request:', { email, phoneNumber, role, inviteMethod, organizationId })

    // Validate required fields
    if (!organizationId || !role || !inviteMethod) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (inviteMethod === 'email' && !email) {
      return new Response(JSON.stringify({ error: 'Email is required for email invitations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (inviteMethod === 'sms' && !phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required for SMS invitations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user already exists (by email or phone)
    if (email) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (existingProfile) {
        // Check if they're already a member of this org
        const { data: existingMember } = await supabaseAdmin
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', existingProfile.id)
          .maybeSingle()

        if (existingMember) {
          return new Response(JSON.stringify({
            error: 'This user is already a member of your organization'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        return new Response(JSON.stringify({
          error: 'This user already has an account. Add them directly from the Team page instead.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // Check for existing pending invitation
    const existingInviteQuery = supabaseAdmin
      .from('invitations')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')

    if (email) {
      existingInviteQuery.eq('email', email.toLowerCase().trim())
    } else {
      existingInviteQuery.eq('phone_number', phoneNumber)
    }

    const { data: existingInvite } = await existingInviteQuery.maybeSingle()

    if (existingInvite) {
      return new Response(JSON.stringify({
        error: 'An invitation has already been sent to this person. You can resend it from the pending invitations list.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Generate secure invite token
    const tokenBytes = new Uint8Array(24)
    crypto.getRandomValues(tokenBytes)
    const inviteToken = btoa(String.fromCharCode(...tokenBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        organization_id: organizationId,
        email: email ? email.toLowerCase().trim() : null,
        phone_number: phoneNumber || null,
        role,
        invite_token: inviteToken,
        invite_method: inviteMethod,
        invited_by: invitedBy,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      throw inviteError
    }

    const inviteUrl = `${APP_URL}/invite/${inviteToken}`
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1)

    // Send invitation via email or SMS
    if (inviteMethod === 'email') {
      // Use Supabase's built-in email (via Auth)
      // We'll send a custom email using the admin API
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${inviterName || 'Someone'}</strong> has invited you to join <strong>${organizationName}</strong> on ChurchConnect as a <strong>${roleDisplay}</strong>.
            </p>
            <p style="font-size: 16px; margin-bottom: 25px;">
              ChurchConnect helps churches stay connected with their community through smart communication tools.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
              This invitation will expire in 7 days.
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              ChurchConnect - Keeping Churches Connected
            </p>
          </div>
        </body>
        </html>
      `

      const emailText = `
You're Invited to ${organizationName}!

${inviterName || 'Someone'} has invited you to join ${organizationName} on ChurchConnect as a ${roleDisplay}.

Click the link below to accept and create your account:
${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
      `.trim()

      // Send email using Supabase Auth Admin API's email sending
      // Since Supabase doesn't have a direct email API, we'll use a workaround
      // by calling Resend/SendGrid if available, or falling back to logging

      // For now, let's try using the Supabase Edge Function built-in fetch to send via SMTP
      // or we can use the auth.admin.inviteUserByEmail which sends an email

      // Actually, the cleanest way is to use Supabase's auth.admin.generateLink
      // but that's for password reset. Let's use a simple SMTP approach or log it.

      // Check if we have Resend API key
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

      if (RESEND_API_KEY) {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'ChurchConnect <noreply@lawonecloud.com>',
            to: email,
            subject: `You're invited to join ${organizationName} on ChurchConnect`,
            html: emailHtml,
            text: emailText
          })
        })

        if (!emailResponse.ok) {
          const emailError = await emailResponse.text()
          console.error('Email send error:', emailError)
          // Don't fail the invitation, just log the error
          console.log('Email could not be sent, but invitation was created')
        }
      } else {
        // No email service configured - log the invite URL
        console.log('=== INVITATION EMAIL (No email service configured) ===')
        console.log(`To: ${email}`)
        console.log(`Subject: You're invited to join ${organizationName}`)
        console.log(`Invite URL: ${inviteUrl}`)
        console.log('=====================================================')
      }

    } else if (inviteMethod === 'sms') {
      // Send SMS via Twilio
      const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
      const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
      const FROM_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER')

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !FROM_PHONE) {
        console.error('Twilio not configured')
        // Don't fail - invitation is still created
      } else {
        // Clean phone number
        const cleanPhone = phoneNumber.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`

        const smsMessage = `${organizationName} invited you to join ChurchConnect as ${roleDisplay}. Create your account: ${inviteUrl} (Expires in 7 days)`

        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: formattedPhone,
              From: FROM_PHONE,
              Body: smsMessage
            }),
          }
        )

        if (!twilioResponse.ok) {
          const smsError = await twilioResponse.text()
          console.error('SMS send error:', smsError)
        } else {
          console.log('SMS invitation sent successfully')
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        phone_number: invitation.phone_number,
        role: invitation.role,
        status: invitation.status,
        expires_at: invitation.expires_at,
        invite_url: inviteUrl
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in send-invite:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
