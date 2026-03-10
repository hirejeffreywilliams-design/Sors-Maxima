import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!resend) {
  console.warn("RESEND_API_KEY is missing. Email service will skip sending emails.");
}

const FROM_EMAIL = process.env.FROM_EMAIL || "Sors Maxima <noreply@sorsmaxima.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hirejeffreywilliams@gmail.com";

export async function sendApplicationConfirmation(to: string, username: string, tier: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Application Received — Sors Maxima ${tier}`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;">Application Received</h1>
          <p style="color:#94a3b8;">Hi ${username},</p>
          <p>We've received your application for the <strong style="color:#6366f1;">${tier}</strong> tier. Our team reviews every application to maintain the quality of our community.</p>
          <p>You'll hear from us within 24-48 hours regarding your status.</p>
          <p style="color:#475569;font-size:12px;margin-top:24px;">Thank you for your patience.</p>
        </div>
      `,
    });
    if (error) { console.error("Error sending application confirmation email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send application confirmation email:", err);
    return false;
  }
}

export async function sendApplicationApproved(to: string, username: string, tier: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Application Approved — Welcome to Sors Maxima ${tier}`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;">Welcome Aboard</h1>
          <p style="color:#94a3b8;">Hi ${username},</p>
          <p>Your application for the <strong style="color:#6366f1;">${tier}</strong> tier has been <strong style="color:#22c55e;">APPROVED</strong>.</p>
          <p>You can now log in and complete your subscription to access your new edge.</p>
          <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}/pricing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">Complete Subscription →</a>
        </div>
      `,
    });
    if (error) { console.error("Error sending application approved email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send application approved email:", err);
    return false;
  }
}

export async function sendApplicationRejected(to: string, username: string, tier: string, notes?: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Update regarding your Sors Maxima application`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;">Application Update</h1>
          <p style="color:#94a3b8;">Hi ${username},</p>
          <p>Thank you for your interest in Sors Maxima ${tier}. At this time, we are unable to approve your application for this tier.</p>
          ${notes ? `<p style="color:#94a3b8; font-style: italic;">Note from our team: ${notes}</p>` : ''}
          <p>You are still welcome to join our Sharp tier, which is open to all members.</p>
          <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}/pricing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px;">View Sharp Tier →</a>
        </div>
      `,
    });
    if (error) { console.error("Error sending application rejected email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send application rejected email:", err);
    return false;
  }
}

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
          
          <div style="background:#1e293b;padding:24px;border-radius:8px;margin:24px 0;border-left:4px solid #6366f1;">
            <h2 style="color:white;font-size:18px;margin-top:0;">🚀 Start Here: 4-Step Quick Guide</h2>
            <ol style="color:#cbd5e1;line-height:1.6;margin-bottom:0;">
              <li><strong>Sync Your Books:</strong> Connect your sportsbook accounts in Settings to track your performance automatically.</li>
              <li><strong>Check the Command Center:</strong> This is where our 46-factor model's highest-confidence picks live.</li>
              <li><strong>Explore the Props Engine:</strong> Use our specialized tools to find value in player markets.</li>
              <li><strong>Set Your Alerts:</strong> Get notified the second a line moves in your favor.</li>
            </ol>
          </div>

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

export async function sendDay2Email(to: string, username: string, tier: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your picks are live — How to read the Sors Maxima model`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;font-size:24px;">Your Picks are Live</h1>
          <p style="color:#94a3b8;">Hi ${username},</p>
          <p>You've had access to the platform for 24 hours. Here's how to interpret the model's output to maximize your edge:</p>
          
          <div style="margin:24px 0;">
            <div style="margin-bottom:16px;">
              <strong style="color:#6366f1;display:block;">Grade Explanation (A/B/C)</strong>
              <p style="color:#cbd5e1;margin-top:4px;font-size:14px;">Our model assigns a letter grade based on the strength of the edge. <strong>A+</strong> represents a massive historical outlier, while <strong>C</strong> picks are marginal value.</p>
            </div>
            
            <div style="margin-bottom:16px;">
              <strong style="color:#6366f1;display:block;">Confidence %</strong>
              <p style="color:#cbd5e1;margin-top:4px;font-size:14px;">This is the model's calculated probability of the outcome hitting, adjusted for current market volatility and lineup changes.</p>
            </div>
            
            <div style="margin-bottom:16px;">
              <strong style="color:#6366f1;display:block;">What EV Means</strong>
              <p style="color:#cbd5e1;margin-top:4px;font-size:14px;">Expected Value (EV) measures how much you'd expect to win on average per bet. A +5% EV means the model thinks the odds are 5% better than what the book is offering.</p>
            </div>
          </div>

          <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Go to Command Center →</a>
        </div>
      `,
    });
    if (error) { console.error("Error sending day 2 email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send day 2 email:", err);
    return false;
  }
}

export async function sendDay7Email(to: string, username: string, tier: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `One week in — Fine-tuning your Sors Maxima strategy`,
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <h1 style="color:white;font-size:24px;">Your First Week</h1>
          <p style="color:#94a3b8;">Hi ${username},</p>
          <p>You've been with us for a week. Now that you've seen the model in action, it's time to use our advanced features to fine-tune your approach:</p>
          
          <div style="margin:24px 0;">
            <div style="margin-bottom:16px;">
              <strong style="color:#6366f1;display:block;">Mastering CLV</strong>
              <p style="color:#cbd5e1;margin-top:4px;font-size:14px;">Closing Line Value (CLV) is the ultimate metric for sharp bettors. If you're consistently beating the closing line, you're a long-term winner.</p>
            </div>
            
            <div style="margin-bottom:16px;">
              <strong style="color:#6366f1;display:block;">Strategy Coach</strong>
              <p style="color:#cbd5e1;margin-top:4px;font-size:14px;">Use the Strategy Advisor to see where your specific strengths lie. It might reveal that you're an elite MLB prop bettor but struggle with NFL totals.</p>
            </div>
            
            <div style="margin-bottom:16px;">
              <strong style="color:#6366f1;display:block;">The Community</strong>
              <p style="color:#cbd5e1;margin-top:4px;font-size:14px;">Check the community feed to see what other sharp members are playing and discuss model outliers in real-time.</p>
            </div>
          </div>

          <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}/tools" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Explore Pro Tools →</a>
        </div>
      `,
    });
    if (error) { console.error("Error sending day 7 email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send day 7 email:", err);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, username: string, resetLink: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset Your Sors Maxima Password",
      html: `
        <div style="background-color:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:500px;margin:0 auto;">
          <img src="https://app.sorsmaxima.com/logo.png" alt="Sors Maxima" style="width:48px;height:48px;border-radius:12px;margin-bottom:24px;" />
          <h1 style="color:white;margin:0 0 8px 0;">Password Reset</h1>
          <p style="color:#94a3b8;margin:0 0 24px 0;">Hi ${username},</p>
          <p style="color:#cbd5e1;margin:0 0 24px 0;">We received a request to reset your Sors Maxima password. Click the button below to choose a new one. This link expires in <strong style="color:#f1f5f9;">1 hour</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;background:#6366f1;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;margin-bottom:24px;">Reset My Password →</a>
          <p style="color:#64748b;font-size:13px;margin:0 0 8px 0;">Or copy this link into your browser:</p>
          <p style="color:#6366f1;font-size:12px;word-break:break-all;margin:0 0 24px 0;">${resetLink}</p>
          <div style="border-top:1px solid #1e293b;padding-top:16px;">
            <p style="color:#475569;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email. Your password will not change unless you click the link above.</p>
          </div>
        </div>
      `,
    });
    if (error) { console.error("Error sending password reset email:", error); return false; }
    return true;
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    return false;
  }
}

// ── Retention Sequence Emails ─────────────────────────────────────────────────

const APP_URL = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.sorsmaxima.com'}`;

export async function sendTrialDay3Email(to: string, username: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL, to,
      subject: `Day 3 of your Sors Maxima Edge trial — tips to maximise it`,
      html: `<div style="background:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:520px;margin:0 auto;">
        <p style="color:#6366f1;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Day 3 · Your Edge Trial</p>
        <h1 style="font-size:24px;margin:0 0 8px;">You're already ahead of 90% of bettors.</h1>
        <p style="color:#94a3b8;margin:0 0 24px;">Hi ${username}, most people just guess. You're using a 46-factor ML model and real odds data. Here are three features most trial users don't discover until it's too late:</p>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:12px;border-left:3px solid #6366f1;">
          <strong style="display:block;margin-bottom:4px;">🎯 CLV Tracker</strong>
          <span style="color:#94a3b8;font-size:14px;">Closing Line Value tells you if you're beating the market. Long-term CLV+ = long-term winner.</span>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:12px;border-left:3px solid #22c55e;">
          <strong style="display:block;margin-bottom:4px;">⚡ Smart Ticket Generator</strong>
          <span style="color:#94a3b8;font-size:14px;">Let the model build a correlated parlay around the day's highest-EV plays. The hard work is done for you.</span>
        </div>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:24px;border-left:3px solid #f59e0b;">
          <strong style="display:block;margin-bottom:4px;">🎲 Monte Carlo Simulations</strong>
          <span style="color:#94a3b8;font-size:14px;">10,000 simulated outcomes per game. See your actual win probability, not just the model's score.</span>
        </div>
        <a href="${APP_URL}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Explore These Features →</a>
        <p style="color:#475569;font-size:12px;margin-top:24px;">4 days left in your trial.</p>
      </div>`,
    });
    return !error;
  } catch { return false; }
}

export async function sendTrialDay5Email(to: string, username: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL, to,
      subject: `⏰ 2 days left on your Edge trial — here's what you'd be leaving behind`,
      html: `<div style="background:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:520px;margin:0 auto;">
        <p style="color:#f59e0b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">⏰ 2 Days Remaining</p>
        <h1 style="font-size:24px;margin:0 0 8px;">Your trial ends in 48 hours.</h1>
        <p style="color:#94a3b8;margin:0 0 24px;">Hi ${username}, your free access to Edge closes in 2 days. Here's what disappears when the trial ends:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">✓</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;">CLV Tracker &amp; Closing Line Analysis</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">✓</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;">Player Props Engine (600+ markets)</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">✓</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;">Monte Carlo Win Probability (10K sims)</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">✓</td><td style="padding:10px 0;border-bottom:1px solid #1e293b;">Strategy Advisor &amp; Bankroll Tools</td></tr>
          <tr><td style="padding:10px 0;color:#94a3b8;">✓</td><td style="padding:10px 0;">Intelligence Cards™ Collection</td></tr>
        </table>
        <p style="color:#cbd5e1;margin-bottom:24px;">Edge is $99/month — about the cost of one small bet. If you use it once a week, it pays for itself. Lock in your rate today and we'll never raise your price.</p>
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#6366f1;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:16px;">Convert to Edge — $99/mo →</a>
        <p style="color:#475569;font-size:12px;margin-top:24px;">Cancel anytime. No price increases for existing members.</p>
      </div>`,
    });
    return !error;
  } catch { return false; }
}

export async function sendTrialLastDayEmail(to: string, username: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL, to,
      subject: `🚨 Last day — your Sors Maxima Edge trial expires today`,
      html: `<div style="background:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:520px;margin:0 auto;">
        <div style="background:#ef444415;border:1px solid #ef444430;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
          <span style="font-size:32px;">🚨</span>
          <p style="color:#fca5a5;font-weight:700;margin:8px 0 0;">Trial expires tonight</p>
        </div>
        <h1 style="font-size:22px;margin:0 0 16px;">This is your last chance, ${username}.</h1>
        <p style="color:#94a3b8;margin:0 0 24px;">After midnight, your Edge access will close. You'll drop to free tier — no CLV tracking, no Monte Carlo, no props engine, no edge.</p>
        <p style="color:#cbd5e1;font-weight:600;margin:0 0 24px;">Every day you delay is a day you're betting without the full model.</p>
        <a href="${APP_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:18px;margin-bottom:16px;">Keep My Edge Access →</a>
        <p style="color:#64748b;font-size:13px;margin:0;">$99/month. Cancel anytime. Members keep their pick history forever.</p>
      </div>`,
    });
    return !error;
  } catch { return false; }
}

export async function sendWinBackEmail(to: string, username: string, promoCode: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL, to,
      subject: `We miss you — here's 30% off your first month back`,
      html: `<div style="background:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:520px;margin:0 auto;">
        <h1 style="font-size:24px;margin:0 0 8px;">Come back to your edge, ${username}.</h1>
        <p style="color:#94a3b8;margin:0 0 24px;">The model has continued learning since you left. We've settled 600+ picks, improved accuracy, and added new engines. You're missing out.</p>
        <div style="background:#1e293b;border:2px dashed #6366f1;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your personal promo code</p>
          <div style="font-size:28px;font-weight:900;letter-spacing:4px;color:#6366f1;">${promoCode}</div>
          <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">30% off your first month back. Expires in 7 days.</p>
        </div>
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#6366f1;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Reactivate with ${promoCode} →</a>
      </div>`,
    });
    return !error;
  } catch { return false; }
}

export async function sendUpgradeNudgeEmail(to: string, username: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL, to,
      subject: `Unlock the full model — Edge is now available to you`,
      html: `<div style="background:#0f172a;color:white;padding:40px;font-family:sans-serif;border-radius:8px;max-width:520px;margin:0 auto;">
        <p style="color:#6366f1;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Exclusive Upgrade Offer</p>
        <h1 style="font-size:24px;margin:0 0 8px;">Hi ${username} — you've been a Sharp member.</h1>
        <p style="color:#94a3b8;margin:0 0 24px;">You've been using the core picks. Here's what Edge members get that you don't:</p>
        <div style="margin-bottom:24px;">
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;"><span style="color:#6366f1;font-size:18px;">⚡</span><div><strong>CLV Tracker</strong><br/><span style="color:#94a3b8;font-size:14px;">Know if you're beating the closing line — the #1 predictor of long-term profitability.</span></div></div>
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;"><span style="color:#6366f1;font-size:18px;">🎲</span><div><strong>Monte Carlo Simulations</strong><br/><span style="color:#94a3b8;font-size:14px;">10,000 game simulations to give you real win probabilities, not just grades.</span></div></div>
          <div style="display:flex;gap:12px;align-items:flex-start;"><span style="color:#6366f1;font-size:18px;">📊</span><div><strong>Player Props Engine</strong><br/><span style="color:#94a3b8;font-size:14px;">600+ prop markets analyzed in real-time. Find value in player lines before the books adjust.</span></div></div>
        </div>
        <p style="color:#6366f1;font-weight:600;margin-bottom:16px;">Try Edge free for 7 days — no charge until your trial ends.</p>
        <a href="${APP_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Start My 7-Day Edge Trial →</a>
      </div>`,
    });
    return !error;
  } catch { return false; }
}
