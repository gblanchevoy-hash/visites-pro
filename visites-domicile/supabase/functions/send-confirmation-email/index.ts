import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'contact@itilib.fr'
const FROM_NAME = 'Itilib'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { email, confirmation_url, type } = await req.json()

    if (!email || !confirmation_url) {
      return new Response(JSON.stringify({ error: 'email et confirmation_url requis' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    const isReset = type === 'recovery'

    const subject = isReset
      ? 'Réinitialisez votre mot de passe — Itilib'
      : 'Confirmez votre adresse email — Itilib'

    const html = isReset ? `
<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#2563EB,#1D4ED8);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
    <img src="https://www.itilib.fr/icons/logo.png" alt="Itilib" width="48" height="48" style="border-radius:12px;display:block;margin:0 auto 10px;"/><span style="color:#ffffff;font-size:22px;font-weight:800;">Itilib</span>
    <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">L'outil indispensable des pros itinérants</p>
  </div>
  <div style="padding:40px 32px;border:1px solid #E2E8F0;border-top:none;">
    <h1 style="font-size:24px;font-weight:800;color:#0F172A;margin:0 0 12px;">Réinitialisez votre mot de passe</h1>
    <p style="font-size:15px;color:#64748B;line-height:1.7;margin:0 0 28px;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez ci-dessous pour en choisir un nouveau.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${confirmation_url}" style="display:inline-block;background:linear-gradient(175deg,#2563EB,#1D4ED8);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:14px;text-decoration:none;box-shadow:0 8px 24px rgba(37,99,235,0.30);">
        Choisir un nouveau mot de passe →
      </a>
    </div>
    <p style="font-size:13px;color:#94A3B8;text-align:center;margin:24px 0 0;line-height:1.6;">
      Ce lien expire dans <strong style="color:#64748B;">1 heure</strong>.<br/>
      Si vous n'avez pas fait cette demande, ignorez cet email.
    </p>
  </div>
  <div style="padding:20px 32px;background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;text-align:center;">
    <p style="font-size:12px;color:#94A3B8;margin:0;">© 2026 Itilib · <a href="https://www.itilib.fr" style="color:#2563EB;text-decoration:none;">www.itilib.fr</a></p>
  </div>
</div>` : `
<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#2563EB,#1D4ED8);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
    <img src="https://www.itilib.fr/icons/logo.png" alt="Itilib" width="48" height="48" style="border-radius:12px;display:block;margin:0 auto 10px;"/><span style="color:#ffffff;font-size:22px;font-weight:800;">Itilib</span>
    <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">L'outil indispensable des pros itinérants</p>
  </div>
  <div style="padding:40px 32px;border:1px solid #E2E8F0;border-top:none;">
    <h1 style="font-size:24px;font-weight:800;color:#0F172A;margin:0 0 12px;">Confirmez votre adresse email</h1>
    <p style="font-size:15px;color:#64748B;line-height:1.7;margin:0 0 28px;">Bienvenue sur Itilib ! Pour activer votre compte et commencer à organiser vos tournées, cliquez sur le bouton ci-dessous.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${confirmation_url}" style="display:inline-block;background:linear-gradient(175deg,#2563EB,#1D4ED8);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:14px;text-decoration:none;box-shadow:0 8px 24px rgba(37,99,235,0.30);">
        Confirmer mon email →
      </a>
    </div>
    <p style="font-size:13px;color:#94A3B8;text-align:center;margin:24px 0 0;line-height:1.6;">
      Ce lien expire dans <strong style="color:#64748B;">24 heures</strong>.<br/>
      Si vous n'avez pas créé de compte Itilib, ignorez cet email.
    </p>
  </div>
  <div style="padding:20px 32px;background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;text-align:center;">
    <p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.8;">
      © 2026 Itilib · <a href="https://www.itilib.fr" style="color:#2563EB;text-decoration:none;">www.itilib.fr</a><br/>
      <a href="https://www.itilib.fr/legal?tab=confidentialite" style="color:#94A3B8;text-decoration:none;">Politique de confidentialité</a> · 
      <a href="https://www.itilib.fr/legal?tab=mentions" style="color:#94A3B8;text-decoration:none;">Mentions légales</a>
    </p>
  </div>
</div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
