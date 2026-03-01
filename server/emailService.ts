import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!resend) {
  console.warn("RESEND_API_KEY is missing. Email service will skip sending emails.");
}

const FROM_EMAIL = "Sors Maxima <onboarding@resend.dev>"; // Fallback for testing as per instructions

export async function sendVerificationEmail(to: string, username: string, code: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Verify your Sors Maxima account',
      html: `
        <div style="background-color: #0f172a; color: white; padding: 40px; font-family: sans-serif; border-radius: 8px;">
          <h1 style="color: white;">Verify Your Email</h1>
          <p>Hi ${username},</p>
          <p>Your verification code is:</p>
          <div style="font-size: 48px; font-weight: bold; letter-spacing: 10px; margin: 20px 0;">${code}</div>
          <p style="color: #94a3b8;">Expires in 15 minutes</p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending verification email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send verification email:", err);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, username: string, tier: string): Promise<boolean> {
  if (!resend) return false;
  
  const features = {
    Sharp: ["Advanced Analytics", "Live Odds", "Daily Parlays"],
    Edge: ["Advanced Analytics", "Live Odds", "Daily Parlays", "CLV Tracking", "Custom Model Builder"],
    Max: ["All Edge Features", "Priority Support", "Whale-level Insights", "Alpha Access"]
  };

  const tierFeatures = features[tier as keyof typeof features] || [];

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Welcome to Sors Maxima, ${username}!`,
      html: `
        <div style="background-color: #0f172a; color: white; padding: 40px; font-family: sans-serif; border-radius: 8px;">
          <h1 style="color: white;">Welcome to Sors Maxima!</h1>
          <p>Hi ${username},</p>
          <p>You've joined at the <strong>${tier}</strong> tier.</p>
          <p>Your features include:</p>
          <ul>
            ${tierFeatures.map(f => `<li>${f}</li>`).join('')}
          </ul>
          <p>Good luck with your bets!</p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send welcome email:", err);
    return false;
  }
}

export async function sendWeeklyDigest(to: string, username: string, stats: { wins: number, losses: number, winRate: number, clvRate: number }): Promise<boolean> {
  if (!resend) return false;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Your Sors Maxima Weekly Digest',
      html: `
        <div style="background-color: #0f172a; color: white; padding: 40px; font-family: sans-serif; border-radius: 8px;">
          <h1 style="color: white;">Weekly Digest</h1>
          <p>Hi ${username}, here's your performance for the week:</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div><strong>Wins:</strong> ${stats.wins}</div>
            <div><strong>Losses:</strong> ${stats.losses}</div>
            <div><strong>Win Rate:</strong> ${stats.winRate}%</div>
            <div><strong>CLV Rate:</strong> ${stats.clvRate}%</div>
          </div>
          <p style="font-style: italic;">"Keep tracking your edge"</p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending weekly digest email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send weekly digest email:", err);
    return false;
  }
}
