import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists (don't reveal if email exists for security)
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const user = authUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Return success even if user doesn't exist (prevent email enumeration)
      console.log(`[Password Reset] Email not found: ${email}`);
      return new Response(
        JSON.stringify({ message: 'Jika email terdaftar, kode OTP telah dikirim' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check - max 3 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentTokens } = await supabase
      .from('password_reset_tokens')
      .select('id')
      .eq('email', email.toLowerCase())
      .gte('created_at', oneHourAgo);

    if (recentTokens && recentTokens.length >= 3) {
      return new Response(
        JSON.stringify({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save token to database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token: otp,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('[Password Reset] Error saving token:', tokenError);
      throw new Error('Failed to generate reset token');
    }

    // Get email template
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject_template, body_template')
      .eq('template_type', 'password_reset_otp')
      .eq('is_active', true)
      .maybeSingle();

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const userName = profile?.full_name || email.split('@')[0];

    // Prepare email variables
    const variables = {
      name: userName,
      otp: otp,
      valid_minutes: '30',
      app_name: 'Sewa Scaffolding Bali'
    };

    // Replace variables in template
    let subject = template?.subject_template || 'Kode Reset Password - {{app_name}}';
    let body = template?.body_template || `<p>Kode OTP Anda: <strong>${otp}</strong></p>`;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    // Send email via send-email edge function
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: subject,
        html: body,
        template_type: 'password_reset_otp'
      }
    });

    if (emailError) {
      console.error('[Password Reset] Error sending email:', emailError);
      throw new Error('Failed to send email');
    }

    console.log(`[Password Reset] OTP sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ message: 'Kode OTP telah dikirim ke email Anda' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Password Reset] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Terjadi kesalahan' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});