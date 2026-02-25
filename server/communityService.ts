import crypto from 'crypto';
import { pool } from './db';

interface Community {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  avatar?: string;
  bannerColor: string;
  isPublic: boolean;
  isPremium: boolean;
  monthlyPrice: number;
  memberCount: number;
  pickAccuracy: number;
  totalPicks: number;
  winningPicks: number;
  createdAt: Date;
  tags: string[];
  discordWebhook?: string;
}

interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  username: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: Date;
  subscriptionEndsAt?: Date;
}

interface Pick {
  id: string;
  communityId: string;
  authorId: string;
  authorUsername: string;
  title: string;
  sport: string;
  description: string;
  odds: string;
  stake: number;
  confidence: 'low' | 'medium' | 'high' | 'max';
  status: 'pending' | 'won' | 'lost' | 'push' | 'void';
  isPremium: boolean;
  price: number;
  likes: number;
  createdAt: Date;
  settledAt?: Date;
}

interface Tip {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  amount: number;
  platformFee: number;
  creatorReceived: number;
  message?: string;
  pickId?: string;
  createdAt: Date;
}

interface CreatorEarnings {
  totalEarnings: number;
  pendingPayout: number;
  lastPayout?: Date;
  tips: number;
  subscriptions: number;
  paidPicks: number;
}

const PLATFORM_FEE_PERCENT = 15;

class CommunityService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS communities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          creator_id TEXT NOT NULL,
          creator_username TEXT NOT NULL,
          banner_color TEXT DEFAULT '#3b82f6',
          is_public BOOLEAN DEFAULT true,
          is_premium BOOLEAN DEFAULT false,
          monthly_price REAL DEFAULT 0,
          member_count INTEGER DEFAULT 0,
          pick_accuracy REAL DEFAULT 0,
          total_picks INTEGER DEFAULT 0,
          winning_picks INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          tags TEXT[] DEFAULT '{}',
          discord_webhook TEXT
        );
        CREATE TABLE IF NOT EXISTS community_members (
          id TEXT PRIMARY KEY,
          community_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(community_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS community_picks (
          id TEXT PRIMARY KEY,
          community_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          author_username TEXT NOT NULL,
          title TEXT NOT NULL,
          sport TEXT,
          description TEXT,
          odds TEXT,
          stake REAL DEFAULT 0,
          confidence TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          is_premium BOOLEAN DEFAULT false,
          price REAL DEFAULT 0,
          likes INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS community_tips (
          id TEXT PRIMARY KEY,
          from_user_id TEXT NOT NULL,
          from_username TEXT NOT NULL,
          to_user_id TEXT NOT NULL,
          to_username TEXT NOT NULL,
          amount REAL NOT NULL,
          platform_fee REAL NOT NULL,
          creator_received REAL NOT NULL,
          message TEXT,
          pick_id TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await this.seedIfEmpty();
      this.initialized = true;
    } catch (err) {
      console.error('[CommunityService] Init error:', err);
    }
  }

  private async ensureInitialized() {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
  }

  private async seedIfEmpty() {
    const result = await pool.query('SELECT COUNT(*) as count FROM communities');
    const count = parseInt(result.rows[0].count, 10);
    if (count > 0) return;

    const demoCommunities = [
      {
        id: 'comm_1',
        name: 'Sharp NBA Plays',
        description: 'Professional NBA analysis with 65%+ win rate. Daily picks backed by AI analysis.',
        creatorId: 'user_1',
        creatorUsername: 'SharpKing',
        bannerColor: 'from-blue-500 to-purple-600',
        isPublic: true,
        isPremium: true,
        monthlyPrice: 49.99,
        memberCount: 1247,
        pickAccuracy: 67.3,
        totalPicks: 892,
        winningPicks: 600,
        createdAt: new Date('2025-06-01'),
        tags: ['NBA', 'Props', 'High Volume'],
      },
      {
        id: 'comm_2',
        name: 'NFL Underdog Hunters',
        description: 'Finding value in NFL underdogs. Focus on spreads and totals.',
        creatorId: 'user_2',
        creatorUsername: 'GridironGuru',
        bannerColor: 'from-green-500 to-teal-600',
        isPublic: true,
        isPremium: true,
        monthlyPrice: 29.99,
        memberCount: 856,
        pickAccuracy: 58.9,
        totalPicks: 445,
        winningPicks: 262,
        createdAt: new Date('2025-08-15'),
        tags: ['NFL', 'Underdogs', 'Spreads'],
      },
      {
        id: 'comm_3',
        name: 'Free MLB Picks',
        description: 'Community-driven MLB picks. Everyone shares their best plays!',
        creatorId: 'user_3',
        creatorUsername: 'BaseballBoss',
        bannerColor: 'from-orange-500 to-red-600',
        isPublic: true,
        isPremium: false,
        monthlyPrice: 0,
        memberCount: 3421,
        pickAccuracy: 52.1,
        totalPicks: 2156,
        winningPicks: 1123,
        createdAt: new Date('2025-03-20'),
        tags: ['MLB', 'Free', 'Community'],
      },
    ];

    for (const c of demoCommunities) {
      await pool.query(
        `INSERT INTO communities (id, name, description, creator_id, creator_username, banner_color, is_public, is_premium, monthly_price, member_count, pick_accuracy, total_picks, winning_picks, created_at, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.description, c.creatorId, c.creatorUsername, c.bannerColor, c.isPublic, c.isPremium, c.monthlyPrice, c.memberCount, c.pickAccuracy, c.totalPicks, c.winningPicks, c.createdAt, c.tags]
      );
    }
  }

  private rowToCommunity(row: any): Community {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      creatorId: row.creator_id,
      creatorUsername: row.creator_username,
      bannerColor: row.banner_color || '#3b82f6',
      isPublic: row.is_public,
      isPremium: row.is_premium,
      monthlyPrice: row.monthly_price || 0,
      memberCount: row.member_count || 0,
      pickAccuracy: row.pick_accuracy || 0,
      totalPicks: row.total_picks || 0,
      winningPicks: row.winning_picks || 0,
      createdAt: new Date(row.created_at),
      tags: row.tags || [],
      discordWebhook: row.discord_webhook || undefined,
    };
  }

  private rowToMember(row: any): CommunityMember {
    return {
      id: row.id,
      communityId: row.community_id,
      userId: row.user_id,
      username: row.username,
      role: row.role as CommunityMember['role'],
      joinedAt: new Date(row.joined_at),
    };
  }

  private rowToPick(row: any): Pick {
    return {
      id: row.id,
      communityId: row.community_id,
      authorId: row.author_id,
      authorUsername: row.author_username,
      title: row.title,
      sport: row.sport || '',
      description: row.description || '',
      odds: row.odds || '',
      stake: row.stake || 0,
      confidence: row.confidence as Pick['confidence'],
      status: row.status as Pick['status'],
      isPremium: row.is_premium || false,
      price: row.price || 0,
      likes: row.likes || 0,
      createdAt: new Date(row.created_at),
    };
  }

  private rowToTip(row: any): Tip {
    return {
      id: row.id,
      fromUserId: row.from_user_id,
      fromUsername: row.from_username,
      toUserId: row.to_user_id,
      toUsername: row.to_username,
      amount: row.amount,
      platformFee: row.platform_fee,
      creatorReceived: row.creator_received,
      message: row.message || undefined,
      pickId: row.pick_id || undefined,
      createdAt: new Date(row.created_at),
    };
  }

  generateId(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  private getDeterministicBannerColor(name: string): string {
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-indigo-500 to-blue-600',
      'from-yellow-500 to-orange-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  async createCommunity(data: {
    name: string;
    description: string;
    creatorId: string;
    creatorUsername: string;
    isPublic: boolean;
    isPremium: boolean;
    monthlyPrice: number;
    tags: string[];
    discordWebhook?: string;
  }): Promise<Community> {
    await this.ensureInitialized();

    const id = this.generateId('comm');
    const bannerColor = this.getDeterministicBannerColor(data.name);
    const now = new Date();

    await pool.query(
      `INSERT INTO communities (id, name, description, creator_id, creator_username, banner_color, is_public, is_premium, monthly_price, member_count, pick_accuracy, total_picks, winning_picks, created_at, tags, discord_webhook)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 0, 0, 0, $10, $11, $12)`,
      [id, data.name, data.description, data.creatorId, data.creatorUsername, bannerColor, data.isPublic, data.isPremium, data.monthlyPrice, now, data.tags, data.discordWebhook || null]
    );

    const memberId = this.generateId('mem');
    await pool.query(
      `INSERT INTO community_members (id, community_id, user_id, username, role, joined_at)
       VALUES ($1, $2, $3, $4, 'owner', $5)`,
      [memberId, id, data.creatorId, data.creatorUsername, now]
    );

    return {
      id,
      name: data.name,
      description: data.description,
      creatorId: data.creatorId,
      creatorUsername: data.creatorUsername,
      bannerColor,
      isPublic: data.isPublic,
      isPremium: data.isPremium,
      monthlyPrice: data.monthlyPrice,
      memberCount: 1,
      pickAccuracy: 0,
      totalPicks: 0,
      winningPicks: 0,
      createdAt: now,
      tags: data.tags,
      discordWebhook: data.discordWebhook,
    };
  }

  getCommunities(options?: {
    publicOnly?: boolean;
    creatorId?: string;
    search?: string;
  }): Community[] {
    const syncResult = this.getCommunitiesSync(options);
    return syncResult;
  }

  private getCommunitiesSync(options?: {
    publicOnly?: boolean;
    creatorId?: string;
    search?: string;
  }): Community[] {
    return [];
  }

  async getCommunitiesAsync(options?: {
    publicOnly?: boolean;
    creatorId?: string;
    search?: string;
  }): Promise<Community[]> {
    await this.ensureInitialized();

    let query = 'SELECT * FROM communities WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (options?.publicOnly) {
      query += ` AND is_public = true`;
    }
    if (options?.creatorId) {
      query += ` AND creator_id = $${paramIdx++}`;
      params.push(options.creatorId);
    }
    if (options?.search) {
      const searchLower = `%${options.search.toLowerCase()}%`;
      query += ` AND (LOWER(name) LIKE $${paramIdx} OR LOWER(description) LIKE $${paramIdx})`;
      params.push(searchLower);
      paramIdx++;
    }

    query += ' ORDER BY member_count DESC';

    const result = await pool.query(query, params);
    return result.rows.map(r => this.rowToCommunity(r));
  }

  getCommunity(id: string): Community | undefined {
    return undefined;
  }

  async getCommunityAsync(id: string): Promise<Community | undefined> {
    await this.ensureInitialized();
    const result = await pool.query('SELECT * FROM communities WHERE id = $1', [id]);
    if (result.rows.length === 0) return undefined;
    return this.rowToCommunity(result.rows[0]);
  }

  async joinCommunity(communityId: string, userId: string, username: string, isPaid: boolean = false): Promise<{ success: boolean; error?: string; platformFee?: number }> {
    await this.ensureInitialized();

    const commResult = await pool.query('SELECT * FROM communities WHERE id = $1', [communityId]);
    if (commResult.rows.length === 0) {
      return { success: false, error: 'Community not found' };
    }
    const community = this.rowToCommunity(commResult.rows[0]);

    const existingResult = await pool.query(
      'SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );
    if (existingResult.rows.length > 0) {
      return { success: false, error: 'Already a member' };
    }

    let platformFee = 0;

    if (community.isPremium && community.monthlyPrice > 0) {
      if (!isPaid) {
        return { success: false, error: 'Premium community requires subscription payment' };
      }
      platformFee = community.monthlyPrice * (PLATFORM_FEE_PERCENT / 100);
    }

    const memberId = this.generateId('mem');
    await pool.query(
      `INSERT INTO community_members (id, community_id, user_id, username, role, joined_at)
       VALUES ($1, $2, $3, $4, 'member', NOW())
       ON CONFLICT (community_id, user_id) DO NOTHING`,
      [memberId, communityId, userId, username]
    );

    await pool.query(
      'UPDATE communities SET member_count = member_count + 1 WHERE id = $1',
      [communityId]
    );

    return { success: true, platformFee };
  }

  getMembers(communityId: string): CommunityMember[] {
    return [];
  }

  async getMembersAsync(communityId: string): Promise<CommunityMember[]> {
    await this.ensureInitialized();
    const result = await pool.query(
      'SELECT * FROM community_members WHERE community_id = $1',
      [communityId]
    );
    return result.rows.map(r => this.rowToMember(r));
  }

  isMember(communityId: string, userId: string): boolean {
    return false;
  }

  async isMemberAsync(communityId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await pool.query(
      'SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );
    return result.rows.length > 0;
  }

  async createPick(data: {
    communityId: string;
    authorId: string;
    authorUsername: string;
    title: string;
    sport: string;
    description: string;
    odds: string;
    stake: number;
    confidence: 'low' | 'medium' | 'high' | 'max';
    isPremium: boolean;
    price: number;
  }): Promise<Pick> {
    await this.ensureInitialized();

    const id = this.generateId('pick');
    const now = new Date();

    await pool.query(
      `INSERT INTO community_picks (id, community_id, author_id, author_username, title, sport, description, odds, stake, confidence, status, is_premium, price, likes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, 0, $13)`,
      [id, data.communityId, data.authorId, data.authorUsername, data.title, data.sport, data.description, data.odds, data.stake, data.confidence, data.isPremium, data.price, now]
    );

    await pool.query(
      'UPDATE communities SET total_picks = total_picks + 1 WHERE id = $1',
      [data.communityId]
    );

    const pick: Pick = {
      id,
      communityId: data.communityId,
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      title: data.title,
      sport: data.sport,
      description: data.description,
      odds: data.odds,
      stake: data.stake,
      confidence: data.confidence,
      status: 'pending',
      isPremium: data.isPremium,
      price: data.price,
      likes: 0,
      createdAt: now,
    };

    this.sendToDiscord(data.communityId, pick);

    return pick;
  }

  getPicks(communityId: string, options?: { includePremium?: boolean }): Pick[] {
    return [];
  }

  async getPicksAsync(communityId: string, options?: { includePremium?: boolean }): Promise<Pick[]> {
    await this.ensureInitialized();

    let query = 'SELECT * FROM community_picks WHERE community_id = $1';
    if (!options?.includePremium) {
      query += ' AND (is_premium = false OR price = 0)';
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, [communityId]);
    return result.rows.map(r => this.rowToPick(r));
  }

  async settlePick(pickId: string, status: 'won' | 'lost' | 'push' | 'void'): Promise<Pick | undefined> {
    await this.ensureInitialized();

    const pickResult = await pool.query('SELECT * FROM community_picks WHERE id = $1', [pickId]);
    if (pickResult.rows.length === 0) return undefined;

    const now = new Date();
    await pool.query(
      'UPDATE community_picks SET status = $1 WHERE id = $2',
      [status, pickId]
    );

    if (status === 'won') {
      const communityId = pickResult.rows[0].community_id;
      await pool.query(
        `UPDATE communities SET winning_picks = winning_picks + 1,
         pick_accuracy = CASE WHEN total_picks > 0 THEN ((winning_picks + 1)::REAL / total_picks) * 100 ELSE 0 END
         WHERE id = $1`,
        [communityId]
      );
    }

    const updatedResult = await pool.query('SELECT * FROM community_picks WHERE id = $1', [pickId]);
    return this.rowToPick(updatedResult.rows[0]);
  }

  async sendTip(data: {
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    toUsername: string;
    amount: number;
    message?: string;
    pickId?: string;
  }): Promise<{ success: boolean; tip?: Tip; error?: string }> {
    await this.ensureInitialized();

    if (data.amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    const platformFee = data.amount * (PLATFORM_FEE_PERCENT / 100);
    const creatorReceived = data.amount - platformFee;

    const id = this.generateId('tip');
    const now = new Date();

    await pool.query(
      `INSERT INTO community_tips (id, from_user_id, from_username, to_user_id, to_username, amount, platform_fee, creator_received, message, pick_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, data.fromUserId, data.fromUsername, data.toUserId, data.toUsername, data.amount, platformFee, creatorReceived, data.message || null, data.pickId || null, now]
    );

    const tip: Tip = {
      id,
      fromUserId: data.fromUserId,
      fromUsername: data.fromUsername,
      toUserId: data.toUserId,
      toUsername: data.toUsername,
      amount: data.amount,
      platformFee,
      creatorReceived,
      message: data.message,
      pickId: data.pickId,
      createdAt: now,
    };

    return { success: true, tip };
  }

  async purchasePick(data: {
    buyerId: string;
    buyerUsername: string;
    pickId: string;
  }): Promise<{ success: boolean; error?: string; platformFee?: number }> {
    await this.ensureInitialized();

    const pickResult = await pool.query(
      'SELECT * FROM community_picks WHERE id = $1 AND is_premium = true AND price > 0',
      [data.pickId]
    );

    if (pickResult.rows.length === 0) {
      return { success: false, error: 'Pick not found or not for sale' };
    }

    const pick = this.rowToPick(pickResult.rows[0]);
    const platformFee = pick.price * (PLATFORM_FEE_PERCENT / 100);

    return { success: true, platformFee };
  }

  async getCreatorEarnings(userId: string): Promise<CreatorEarnings> {
    await this.ensureInitialized();

    const tipsResult = await pool.query(
      'SELECT COALESCE(SUM(creator_received), 0) as total FROM community_tips WHERE to_user_id = $1',
      [userId]
    );
    const tipsTotal = parseFloat(tipsResult.rows[0].total) || 0;

    return {
      totalEarnings: tipsTotal,
      pendingPayout: tipsTotal,
      tips: tipsTotal,
      subscriptions: 0,
      paidPicks: 0,
    };
  }

  async getTipsReceived(userId: string): Promise<Tip[]> {
    await this.ensureInitialized();
    const result = await pool.query(
      'SELECT * FROM community_tips WHERE to_user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(r => this.rowToTip(r));
  }

  async getTipsSent(userId: string): Promise<Tip[]> {
    await this.ensureInitialized();
    const result = await pool.query(
      'SELECT * FROM community_tips WHERE from_user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(r => this.rowToTip(r));
  }

  async getPlatformRevenue(): Promise<{
    total: number;
    breakdown: {
      subscriptions: number;
      tips: number;
      paidPicks: number;
    };
    feePercent: number;
  }> {
    await this.ensureInitialized();

    const tipsResult = await pool.query(
      'SELECT COALESCE(SUM(platform_fee), 0) as total FROM community_tips'
    );
    const tipsFee = parseFloat(tipsResult.rows[0].total) || 0;

    return {
      total: tipsFee,
      breakdown: { subscriptions: 0, tips: tipsFee, paidPicks: 0 },
      feePercent: PLATFORM_FEE_PERCENT,
    };
  }

  private async sendToDiscord(communityId: string, pick: Pick): Promise<void> {
    const community = await this.getCommunityAsync(communityId);
    if (!community?.discordWebhook) return;

    const confidenceLabel: Record<string, string> = {
      low: '[LOW]',
      medium: '[MED]',
      high: '[HIGH]',
      max: '[MAX]',
    };

    const embed = {
      embeds: [{
        title: `${confidenceLabel[pick.confidence] || ''} New Pick: ${pick.title}`,
        description: pick.description,
        color: 0x00E5FF,
        fields: [
          { name: 'Sport', value: pick.sport, inline: true },
          { name: 'Odds', value: pick.odds, inline: true },
          { name: 'Stake', value: `${pick.stake}u`, inline: true },
          { name: 'Confidence', value: pick.confidence.toUpperCase(), inline: true },
        ],
        footer: { text: `By ${pick.authorUsername} | ${community.name}` },
        timestamp: pick.createdAt.toISOString(),
      }],
    };

    try {
      await fetch(community.discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed),
      });
    } catch (error) {
      console.error('Failed to send to Discord:', error);
    }
  }

  async updateDiscordWebhook(communityId: string, webhook: string): Promise<boolean> {
    await this.ensureInitialized();

    const result = await pool.query(
      'UPDATE communities SET discord_webhook = $1 WHERE id = $2 RETURNING id',
      [webhook, communityId]
    );
    return result.rows.length > 0;
  }
}

export const communityService = new CommunityService();
export type { Community, CommunityMember, Pick, Tip, CreatorEarnings };
