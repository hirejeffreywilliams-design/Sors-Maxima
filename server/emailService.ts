import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!resend) {
  console.warn("RESEND_API_KEY is missing. Email service will skip sending emails.");
}

const FROM_EMAIL = process.env.FROM_EMAIL || "Sors Maxima <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hirejeffreywilliams@gmail.com";

export async function sendVerificationEmail(to: string, username: string, code: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Verify your Sors Maxima account',
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;margin-bottom:8px;">Verify Your Email</h1>
          <p style="color:#94a3b8;">Hi ${username},</p>
          <p>Your verification code is:</p>
          <div style="font-size:48px;font-weight:bold;letter-spacing:10px;margin:24px 0;color:#6366f1;">${code}</div>
          <p style="color:#94a3b8;font-size:14px;">Expires in 15 minutes. If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
    });
    if (error) { console.error("Error sending verification email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send verification email:", err);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, username: string, tier: string): Promise<boolean> {
  if (!resend) return false;
  const features: Record<string, string[]> = {
    Sharp: ["46-Factor Model Picks", "Live Odds Comparison", "Daily Best Tickets", "Command Center Access"],
    Edge: ["Everything in Sharp", "CLV Tracker", "Player Props Engine", "Monte Carlo Simulations", "Strategy Advisor"],
    Max: ["Everything in Edge", "Whale-Only Picks", "Priority Data Pipeline", "Alpha Access to New Features", "Direct Support"],
  };
  const tierFeatures = features[tier] || features.Sharp;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `You're in — Welcome to Sors Maxima ${tier}`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;">Welcome to Sors Maxima</h1>
          <p style="color:#94a3b8;">Hi ${username},</p>
          <p>You're now a <strong style="color:#6366f1;">${tier}</strong> member. Here's what's included:</p>
          <ul style="color:#cbd5e1;line-height:2;">
            ${tierFeatures.map(f => `<li>${f}</li>`).join('')}
          </ul>
          <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">Go to Command Center →</a>
          <p style="color:#475569;font-size:12px;margin-top:24px;">Good luck out there.</p>
        </div>
      `,
    });
    if (error) { console.error("Error sending welcome email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send welcome email:", err);
    return false;
  }
}

export async function sendWeeklyDigest(to: string, username: string, stats: { wins: number; losses: number; winRate: number; clvRate: number }): Promise<boolean> {
  if (!resend) return false;
  const total = stats.wins + stats.losses;
  const trend = stats.winRate >= 55 ? '🔥 Hot streak' : stats.winRate >= 50 ? '✅ Profitable' : '📊 Building edge';
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your weekly edge report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;font-size:22px;">Weekly Edge Report</h1>
          <p style="color:#94a3b8;">Hi ${username}, here's how your picks performed this week:</p>
          <div style="display:flex;gap:16px;margin:24px 0;flex-wrap:wrap;">
            <div style="background:#1e293b;padding:16px 24px;border-radius:8px;flex:1;min-width:100px;">
              <div style="font-size:28px;font-weight:bold;color:#22c55e;">${stats.wins}</div>
              <div style="color:#94a3b8;font-size:13px;">Wins</div>
            </div>
            <div style="background:#1e293b;padding:16px 24px;border-radius:8px;flex:1;min-width:100px;">
              <div style="font-size:28px;font-weight:bold;color:#ef4444;">${stats.losses}</div>
              <div style="color:#94a3b8;font-size:13px;">Losses</div>
            </div>
            <div style="background:#1e293b;padding:16px 24px;border-radius:8px;flex:1;min-width:100px;">
              <div style="font-size:28px;font-weight:bold;color:#6366f1;">${stats.winRate}%</div>
              <div style="color:#94a3b8;font-size:13px;">Win Rate</div>
            </div>
            <div style="background:#1e293b;padding:16px 24px;border-radius:8px;flex:1;min-width:100px;">
              <div style="font-size:28px;font-weight:bold;color:#f59e0b;">${stats.clvRate}%</div>
              <div style="color:#94a3b8;font-size:13px;">CLV Rate</div>
            </div>
          </div>
          <p style="color:#6366f1;font-weight:600;">${trend} — ${total} picks tracked this week</p>
          <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:8px;">View This Week's Picks →</a>
        </div>
      `,
    });
    if (error) { console.error("Error sending weekly digest:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send weekly digest:", err);
    return false;
  }
}

export async function sendAdminDailySummary(stats: {
  newSignups: number;
  activeSubscribers: number;
  proCount: number;
  eliteCount: number;
  whaleCount: number;
  picksSettled: number;
  modelWinRate: number;
  alerts: string[];
}): Promise<boolean> {
  if (!resend) return false;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Sors Maxima Daily Summary — ${today}`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:600px;margin:0 auto;">
          <h1 style="color:white;font-size:20px;margin-bottom:4px;">Daily Operations Summary</h1>
          <p style="color:#475569;font-size:13px;margin-top:0;">${today}</p>

          <h2 style="color:#94a3b8;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin-top:28px;">Growth</h2>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
            <div style="background:#1e293b;padding:14px 20px;border-radius:8px;min-width:100px;">
              <div style="font-size:24px;font-weight:bold;color:#22c55e;">+${stats.newSignups}</div>
              <div style="color:#94a3b8;font-size:12px;">New signups today</div>
            </div>
            <div style="background:#1e293b;padding:14px 20px;border-radius:8px;min-width:100px;">
              <div style="font-size:24px;font-weight:bold;color:#6366f1;">${stats.activeSubscribers}</div>
              <div style="color:#94a3b8;font-size:12px;">Active subscribers</div>
            </div>
          </div>

          <h2 style="color:#94a3b8;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Subscription Mix</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr style="color:#475569;font-size:12px;text-transform:uppercase;">
              <td style="padding:8px 0;">Tier</td><td style="padding:8px 0;">Count</td><td style="padding:8px 0;">MRR</td>
            </tr>
            <tr style="border-top:1px solid #1e293b;">
              <td style="padding:8px 0;color:#94a3b8;">Sharp ($49)</td>
              <td style="padding:8px 0;color:white;">${stats.proCount}</td>
              <td style="padding:8px 0;color:#22c55e;">$${(stats.proCount * 49).toLocaleString()}</td>
            </tr>
            <tr style="border-top:1px solid #1e293b;">
              <td style="padding:8px 0;color:#94a3b8;">Edge ($99)</td>
              <td style="padding:8px 0;color:white;">${stats.eliteCount}</td>
              <td style="padding:8px 0;color:#22c55e;">$${(stats.eliteCount * 99).toLocaleString()}</td>
            </tr>
            <tr style="border-top:1px solid #1e293b;">
              <td style="padding:8px 0;color:#94a3b8;">Max ($249)</td>
              <td style="padding:8px 0;color:white;">${stats.whaleCount}</td>
              <td style="padding:8px 0;color:#22c55e;">$${(stats.whaleCount * 249).toLocaleString()}</td>
            </tr>
            <tr style="border-top:2px solid #334155;font-weight:bold;">
              <td style="padding:8px 0;color:white;">Total MRR</td>
              <td style="padding:8px 0;"></td>
              <td style="padding:8px 0;color:#22c55e;">$${((stats.proCount*49)+(stats.eliteCount*99)+(stats.whaleCount*249)).toLocaleString()}</td>
            </tr>
          </table>

          <h2 style="color:#94a3b8;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Model Performance</h2>
          <p style="color:#cbd5e1;">${stats.picksSettled} picks settled today &nbsp;·&nbsp; <strong style="color:#6366f1;">${stats.modelWinRate}%</strong> overall win rate</p>

          ${stats.alerts.length > 0 ? `
          <h2 style="color:#ef4444;font-size:14px;text-transform:uppercase;letter-spacing:1px;">⚠ Alerts</h2>
          <ul style="color:#fca5a5;">
            ${stats.alerts.map(a => `<li>${a}</li>`).join('')}
          </ul>` : '<p style="color:#22c55e;">✓ No alerts — all systems healthy</p>'}
        </div>
      `,
    });
    if (error) { console.error("Error sending admin daily summary:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send admin daily summary:", err);
    return false;
  }
}

export async function sendPickResultEmail(to: string, username: string, pick: {
  game: string;
  selection: string;
  odds: number;
  result: 'won' | 'lost' | 'push';
  profit?: number;
}): Promise<boolean> {
  if (!resend) return false;
  const isWin = pick.result === 'won';
  const isPush = pick.result === 'push';
  const emoji = isWin ? '🎯' : isPush ? '↩️' : '❌';
  const color = isWin ? '#22c55e' : isPush ? '#f59e0b' : '#ef4444';
  const resultText = isWin ? 'WON' : isPush ? 'PUSH' : 'LOST';
  const oddsDisplay = pick.odds > 0 ? `+${pick.odds}` : `${pick.odds}`;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${emoji} Pick result: ${pick.selection} — ${resultText}`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <div style="font-size:48px;margin-bottom:16px;">${emoji}</div>
          <h1 style="color:${color};font-size:28px;margin:0;">${resultText}</h1>
          <p style="color:#94a3b8;margin-top:4px;">${pick.game}</p>
          <div style="background:#1e293b;padding:20px;border-radius:8px;margin:20px 0;border-left:3px solid ${color};">
            <div style="font-size:18px;font-weight:600;">${pick.selection}</div>
            <div style="color:#64748b;font-size:14px;margin-top:4px;">Odds: ${oddsDisplay}</div>
            ${pick.profit !== undefined ? `<div style="color:${color};font-size:16px;font-weight:600;margin-top:8px;">${isWin ? '+' : ''}$${Math.abs(pick.profit).toFixed(2)}</div>` : ''}
          </div>
          <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">View Today's Picks →</a>
        </div>
      `,
    });
    if (error) { console.error("Error sending pick result email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send pick result email:", err);
    return false;
  }
}
