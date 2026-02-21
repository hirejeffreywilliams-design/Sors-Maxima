// Tipster Communities Service - In-app community feature with monetization

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
  monthlyPrice: number; // 0 for free communities
  memberCount: number;
  pickAccuracy: number;
  totalPicks: number;
  winningPicks: number;
  createdAt: Date;
  tags: string[];
  discordWebhook?: string; // For Discord sync
}

interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  username: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: Date;
  subscriptionEndsAt?: Date; // For premium communities
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
  price: number; // For individual paid picks
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
  platformFee: number; // App owner's cut
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

// Platform fee configuration (App owner revenue)
const PLATFORM_FEE_PERCENT = 15; // 15% of all transactions

class CommunityService {
  private communities: Map<string, Community> = new Map();
  private members: Map<string, CommunityMember[]> = new Map();
  private picks: Map<string, Pick[]> = new Map();
  private tips: Tip[] = [];
  private creatorEarnings: Map<string, CreatorEarnings> = new Map();
  private platformRevenue = 0;

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    // Seed some demo communities
    const demoCommunities: Community[] = [
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

    demoCommunities.forEach(c => this.communities.set(c.id, c));
  }

  generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Community Management
  createCommunity(data: {
    name: string;
    description: string;
    creatorId: string;
    creatorUsername: string;
    isPublic: boolean;
    isPremium: boolean;
    monthlyPrice: number;
    tags: string[];
    discordWebhook?: string;
  }): Community {
    const community: Community = {
      id: this.generateId('comm'),
      name: data.name,
      description: data.description,
      creatorId: data.creatorId,
      creatorUsername: data.creatorUsername,
      bannerColor: this.getRandomBannerColor(),
      isPublic: data.isPublic,
      isPremium: data.isPremium,
      monthlyPrice: data.monthlyPrice,
      memberCount: 1,
      pickAccuracy: 0,
      totalPicks: 0,
      winningPicks: 0,
      createdAt: new Date(),
      tags: data.tags,
      discordWebhook: data.discordWebhook,
    };

    this.communities.set(community.id, community);
    
    // Add creator as owner
    const member: CommunityMember = {
      id: this.generateId('mem'),
      communityId: community.id,
      userId: data.creatorId,
      username: data.creatorUsername,
      role: 'owner',
      joinedAt: new Date(),
    };
    this.members.set(community.id, [member]);
    
    // Initialize creator earnings
    if (!this.creatorEarnings.has(data.creatorId)) {
      this.creatorEarnings.set(data.creatorId, {
        totalEarnings: 0,
        pendingPayout: 0,
        tips: 0,
        subscriptions: 0,
        paidPicks: 0,
      });
    }

    return community;
  }

  private getRandomBannerColor(): string {
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-indigo-500 to-blue-600',
      'from-yellow-500 to-orange-600',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getCommunities(options?: { 
    publicOnly?: boolean; 
    creatorId?: string;
    search?: string;
  }): Community[] {
    let results = Array.from(this.communities.values());
    
    if (options?.publicOnly) {
      results = results.filter(c => c.isPublic);
    }
    if (options?.creatorId) {
      results = results.filter(c => c.creatorId === options.creatorId);
    }
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      results = results.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        c.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    
    return results.sort((a, b) => b.memberCount - a.memberCount);
  }

  getCommunity(id: string): Community | undefined {
    return this.communities.get(id);
  }

  // Membership
  joinCommunity(communityId: string, userId: string, username: string, isPaid: boolean = false): { success: boolean; error?: string; platformFee?: number } {
    const community = this.communities.get(communityId);
    if (!community) {
      return { success: false, error: 'Community not found' };
    }

    const existingMembers = this.members.get(communityId) || [];
    if (existingMembers.some(m => m.userId === userId)) {
      return { success: false, error: 'Already a member' };
    }

    let platformFee = 0;
    let subscriptionEndsAt: Date | undefined;

    if (community.isPremium && community.monthlyPrice > 0) {
      if (!isPaid) {
        return { success: false, error: 'Premium community requires subscription payment' };
      }
      
      // Calculate platform fee and creator earnings
      platformFee = community.monthlyPrice * (PLATFORM_FEE_PERCENT / 100);
      const creatorAmount = community.monthlyPrice - platformFee;
      
      this.platformRevenue += platformFee;
      
      const earnings = this.creatorEarnings.get(community.creatorId) || {
        totalEarnings: 0, pendingPayout: 0, tips: 0, subscriptions: 0, paidPicks: 0
      };
      earnings.totalEarnings += creatorAmount;
      earnings.pendingPayout += creatorAmount;
      earnings.subscriptions += creatorAmount;
      this.creatorEarnings.set(community.creatorId, earnings);

      subscriptionEndsAt = new Date();
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
    }

    const member: CommunityMember = {
      id: this.generateId('mem'),
      communityId,
      userId,
      username,
      role: 'member',
      joinedAt: new Date(),
      subscriptionEndsAt,
    };

    existingMembers.push(member);
    this.members.set(communityId, existingMembers);
    
    community.memberCount = existingMembers.length;
    this.communities.set(communityId, community);

    return { success: true, platformFee };
  }

  getMembers(communityId: string): CommunityMember[] {
    return this.members.get(communityId) || [];
  }

  isMember(communityId: string, userId: string): boolean {
    const members = this.members.get(communityId) || [];
    return members.some(m => m.userId === userId);
  }

  // Picks
  createPick(data: {
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
  }): Pick {
    const pick: Pick = {
      id: this.generateId('pick'),
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
      createdAt: new Date(),
    };

    const communityPicks = this.picks.get(data.communityId) || [];
    communityPicks.unshift(pick);
    this.picks.set(data.communityId, communityPicks);

    // Update community stats
    const community = this.communities.get(data.communityId);
    if (community) {
      community.totalPicks++;
      this.communities.set(data.communityId, community);
    }

    // Send to Discord if webhook configured
    this.sendToDiscord(data.communityId, pick);

    return pick;
  }

  getPicks(communityId: string, options?: { includePremium?: boolean }): Pick[] {
    const picks = this.picks.get(communityId) || [];
    if (options?.includePremium) {
      return picks;
    }
    return picks.filter(p => !p.isPremium || p.price === 0);
  }

  settlePick(pickId: string, status: 'won' | 'lost' | 'push' | 'void'): Pick | undefined {
    const entries = Array.from(this.picks.entries());
    for (const [communityId, picks] of entries) {
      const pick = picks.find((p: Pick) => p.id === pickId);
      if (pick) {
        pick.status = status;
        pick.settledAt = new Date();

        // Update community stats
        const community = this.communities.get(communityId);
        if (community && status === 'won') {
          community.winningPicks++;
          community.pickAccuracy = (community.winningPicks / community.totalPicks) * 100;
          this.communities.set(communityId, community);
        }

        return pick;
      }
    }
    return undefined;
  }

  // Tipping & Monetization
  sendTip(data: {
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    toUsername: string;
    amount: number;
    message?: string;
    pickId?: string;
  }): { success: boolean; tip?: Tip; error?: string } {
    if (data.amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    const platformFee = data.amount * (PLATFORM_FEE_PERCENT / 100);
    const creatorReceived = data.amount - platformFee;

    const tip: Tip = {
      id: this.generateId('tip'),
      fromUserId: data.fromUserId,
      fromUsername: data.fromUsername,
      toUserId: data.toUserId,
      toUsername: data.toUsername,
      amount: data.amount,
      platformFee,
      creatorReceived,
      message: data.message,
      pickId: data.pickId,
      createdAt: new Date(),
    };

    this.tips.push(tip);
    this.platformRevenue += platformFee;

    // Update creator earnings
    const earnings = this.creatorEarnings.get(data.toUserId) || {
      totalEarnings: 0, pendingPayout: 0, tips: 0, subscriptions: 0, paidPicks: 0
    };
    earnings.totalEarnings += creatorReceived;
    earnings.pendingPayout += creatorReceived;
    earnings.tips += creatorReceived;
    this.creatorEarnings.set(data.toUserId, earnings);

    return { success: true, tip };
  }

  purchasePick(data: {
    buyerId: string;
    buyerUsername: string;
    pickId: string;
  }): { success: boolean; error?: string; platformFee?: number } {
    const allPicks = Array.from(this.picks.values());
    for (const picks of allPicks) {
      const pick = picks.find((p: Pick) => p.id === data.pickId);
      if (pick && pick.isPremium && pick.price > 0) {
        const platformFee = pick.price * (PLATFORM_FEE_PERCENT / 100);
        const creatorAmount = pick.price - platformFee;

        this.platformRevenue += platformFee;

        const earnings = this.creatorEarnings.get(pick.authorId) || {
          totalEarnings: 0, pendingPayout: 0, tips: 0, subscriptions: 0, paidPicks: 0
        };
        earnings.totalEarnings += creatorAmount;
        earnings.pendingPayout += creatorAmount;
        earnings.paidPicks += creatorAmount;
        this.creatorEarnings.set(pick.authorId, earnings);

        return { success: true, platformFee };
      }
    }
    return { success: false, error: 'Pick not found or not for sale' };
  }

  getCreatorEarnings(userId: string): CreatorEarnings {
    return this.creatorEarnings.get(userId) || {
      totalEarnings: 0, pendingPayout: 0, tips: 0, subscriptions: 0, paidPicks: 0
    };
  }

  getTipsReceived(userId: string): Tip[] {
    return this.tips.filter(t => t.toUserId === userId);
  }

  getTipsSent(userId: string): Tip[] {
    return this.tips.filter(t => t.fromUserId === userId);
  }

  // Platform Revenue (for app owner)
  getPlatformRevenue(): { 
    total: number; 
    breakdown: { 
      subscriptions: number; 
      tips: number; 
      paidPicks: number; 
    };
    feePercent: number;
  } {
    let subscriptions = 0;
    let tips = 0;
    let paidPicks = 0;

    this.tips.forEach(t => {
      tips += t.platformFee;
    });

    // Estimate subscriptions and paid picks from platform revenue minus tips
    const remaining = this.platformRevenue - tips;
    subscriptions = remaining * 0.7;
    paidPicks = remaining * 0.3;

    return {
      total: this.platformRevenue,
      breakdown: { subscriptions, tips, paidPicks },
      feePercent: PLATFORM_FEE_PERCENT,
    };
  }

  // Discord Integration
  private async sendToDiscord(communityId: string, pick: Pick): Promise<void> {
    const community = this.communities.get(communityId);
    if (!community?.discordWebhook) return;

    const confidenceEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      max: '🔴',
    };

    const embed = {
      embeds: [{
        title: `${confidenceEmoji[pick.confidence]} New Pick: ${pick.title}`,
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

  updateDiscordWebhook(communityId: string, webhook: string): boolean {
    const community = this.communities.get(communityId);
    if (!community) return false;
    
    community.discordWebhook = webhook;
    this.communities.set(communityId, community);
    return true;
  }
}

export const communityService = new CommunityService();
export type { Community, CommunityMember, Pick, Tip, CreatorEarnings };
