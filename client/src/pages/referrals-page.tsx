import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { STAGING_API_URL } from '../config';
import { useState } from "react";
import { Copy, Share2, Trophy, DollarSign, Coins, Users, CheckCircle2, Clock, ExternalLink, Loader2, Gift, Sparkles, Crown, Medal, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalUsdcEarned: string;
  totalRoxnEarned: string;
  pendingUsdcReward: string;
  pendingRoxnReward: string;
}

interface ReferralInfo {
  code: string;
  link: string;
  stats: ReferralStats;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  referrals: number;
  earned: string;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number;
}

interface PayoutRequest {
  id: number;
  usdcAmount: string;
  roxnAmount: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  usdcTxHash?: string;
  roxnTxHash?: string;
}

interface PayoutStatusResponse {
  hasPendingRequest: boolean;
  latestRequest?: PayoutRequest;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "cyan" | "purple" | "amber" | "emerald";
}) {
  const colorClasses = {
    cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    purple: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`card-noir p-5 border ${colorClasses[color].split(' ')[2]}`}
    >
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color].split(' ').slice(0, 2).join(' ')} mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
    </motion.div>
  );
}

// Leaderboard Entry Component
function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30";
    return "bg-muted/30 border-border/50";
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`flex items-center justify-between p-4 rounded-xl border ${getRankStyle(entry.rank)} ${
        isCurrentUser ? 'ring-2 ring-primary/50' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
          entry.rank === 1 ? 'bg-yellow-500 text-black' :
          entry.rank === 2 ? 'bg-gray-400 text-black' :
          entry.rank === 3 ? 'bg-amber-600 text-white' :
          'bg-muted text-muted-foreground'
        }`}>
          {getRankIcon(entry.rank) || entry.rank}
        </div>
        <div>
          <p className="font-mono font-medium">{entry.username}</p>
          <p className="text-xs text-muted-foreground">{entry.referrals} referrals</p>
        </div>
      </div>
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-mono">
        {entry.earned}
      </Badge>
    </motion.div>
  );
}

export default function ReferralsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customCode, setCustomCode] = useState("");

  // Fetch referral info
  const { data: referralInfo, isLoading: loadingInfo } = useQuery<ReferralInfo>({
    queryKey: ['referralInfo'],
    queryFn: async () => {
      const response = await fetch(`${STAGING_API_URL}/api/referral/code`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch referral info');
      return response.json();
    },
    enabled: !!user
  });

  // Fetch leaderboard
  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery<LeaderboardResponse>({
    queryKey: ['referralLeaderboard'],
    queryFn: async () => {
      const response = await fetch(`${STAGING_API_URL}/api/referral/leaderboard?limit=10`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    }
  });

  // Fetch payout status
  const { data: payoutStatus, isLoading: loadingPayoutStatus } = useQuery<PayoutStatusResponse>({
    queryKey: ['payoutStatus'],
    queryFn: async () => {
      const response = await fetch(`${STAGING_API_URL}/api/referral/payout/status`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch payout status');
      return response.json();
    },
    enabled: !!user
  });

  // Create custom code mutation
  const createCustomCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch(`${STAGING_API_URL}/api/referral/code/custom`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create custom code');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralInfo'] });
      toast({ title: "Custom code created!" });
      setCustomCode("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Request payout mutation
  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${STAGING_API_URL}/api/referral/rewards/claim`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request payout');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['referralInfo'] });
      queryClient.invalidateQueries({ queryKey: ['payoutStatus'] });
      toast({
        title: "Payout Requested!",
        description: data.message || "Our team will review and process your rewards."
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`Join Roxonn and earn rewards! Use my referral code: ${referralInfo?.code}\n\n${referralInfo?.link}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(referralInfo?.link || '');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const stats = referralInfo?.stats;
  const hasPendingRewards = stats && (parseFloat(stats.pendingUsdcReward) > 0 || parseFloat(stats.pendingRoxnReward) > 0);

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <Gift className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-violet-400">Referral Program</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="gradient-text-purple">Refer & Earn</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Earn <span className="text-emerald-400 font-bold">$2 USDC</span> + <span className="text-violet-400 font-bold">10 ROXN</span> for every friend who subscribes!
            </p>
          </motion.div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Referral Code Card */}
            <motion.div variants={itemVariants} className="card-noir p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Your Referral Code</h3>
                  <p className="text-sm text-muted-foreground">Share this code with friends</p>
                </div>
              </div>

              {loadingInfo ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-14 bg-muted/50 rounded-xl" />
                  <div className="h-10 bg-muted/50 rounded-lg" />
                </div>
              ) : (
                <>
                  {/* Code Display */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-xl p-4 font-mono text-2xl font-bold text-center tracking-wider">
                      {referralInfo?.code}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-14 w-14 border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                      onClick={() => copyToClipboard(referralInfo?.code || '', 'Code')}
                    >
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Link Display */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={referralInfo?.link || ''}
                      readOnly
                      className="flex-1 bg-muted/30 border-border/50 text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border/50 hover:border-primary/50"
                      onClick={() => copyToClipboard(referralInfo?.link || '', 'Link')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Share Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={shareOnTwitter} variant="outline" className="flex-1 border-border/50 hover:border-primary/50">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Share on X
                    </Button>
                    <Button onClick={shareOnLinkedIn} variant="outline" className="flex-1 border-border/50 hover:border-primary/50">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      LinkedIn
                    </Button>
                  </div>
                </>
              )}
            </motion.div>

            {/* Stats Cards */}
            <motion.div variants={containerVariants} className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Total Referrals"
                value={stats?.totalReferrals || 0}
                color="cyan"
              />
              <StatCard
                icon={<Clock className="h-4 w-4" />}
                label="Pending"
                value={stats?.pendingReferrals || 0}
                color="amber"
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Converted"
                value={stats?.convertedReferrals || 0}
                color="emerald"
              />
              <StatCard
                icon={<Trophy className="h-4 w-4" />}
                label="Your Rank"
                value={leaderboardData?.userRank ? `#${leaderboardData.userRank}` : '-'}
                color="purple"
              />
            </motion.div>
          </div>

          {/* Earnings Section */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold">Your Earnings</h3>
            </div>

            {loadingInfo ? (
              <div className="animate-pulse h-40 bg-muted/30 rounded-xl" />
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Total Earned */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <h4 className="font-medium">Total Earned</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold font-mono text-emerald-400">${stats?.totalUsdcEarned || '0.00'}</p>
                      <p className="text-sm text-muted-foreground">USDC</p>
                    </div>
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold font-mono text-violet-400">{stats?.totalRoxnEarned || '0.00'}</p>
                      <p className="text-sm text-muted-foreground">ROXN</p>
                    </div>
                  </div>
                </div>

                {/* Pending Rewards */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <h4 className="font-medium">Pending Rewards</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold font-mono text-amber-400">${stats?.pendingUsdcReward || '0.00'}</p>
                      <p className="text-sm text-muted-foreground">USDC</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold font-mono text-amber-400">{stats?.pendingRoxnReward || '0.00'}</p>
                      <p className="text-sm text-muted-foreground">ROXN</p>
                    </div>
                  </div>

                  {/* Payout Status */}
                  {payoutStatus?.hasPendingRequest ? (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        <span className="font-medium text-blue-400">Payout Request Pending</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${payoutStatus.latestRequest?.usdcAmount} USDC + {payoutStatus.latestRequest?.roxnAmount} ROXN is being reviewed.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested: {payoutStatus.latestRequest?.createdAt ? new Date(payoutStatus.latestRequest.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  ) : payoutStatus?.latestRequest?.status === 'paid' && payoutStatus.latestRequest.paidAt ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="font-medium text-emerald-400">Last Payout Completed</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${payoutStatus.latestRequest.usdcAmount} USDC + {payoutStatus.latestRequest.roxnAmount} ROXN paid on {new Date(payoutStatus.latestRequest.paidAt).toLocaleDateString()}
                      </p>
                      {payoutStatus.latestRequest.usdcTxHash && (
                        <a
                          href={`https://xdcscan.io/tx/${payoutStatus.latestRequest.usdcTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          View Transaction <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ) : null}

                  {hasPendingRewards && !payoutStatus?.hasPendingRequest && (
                    <Button
                      className="w-full btn-primary"
                      onClick={() => requestPayoutMutation.mutate()}
                      disabled={requestPayoutMutation.isPending || loadingPayoutStatus}
                    >
                      {requestPayoutMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Coins className="h-4 w-4 mr-2" />
                          Request Payout
                        </>
                      )}
                    </Button>
                  )}

                  {!hasPendingRewards && !payoutStatus?.hasPendingRequest && (
                    <p className="text-sm text-center text-muted-foreground py-2">
                      No pending rewards. Refer more friends to earn!
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Leaderboard */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold">Top Referrers</h3>
              </div>
              {leaderboardData?.userRank && leaderboardData.userRank > 0 && (
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                  Your Rank: #{leaderboardData.userRank}
                </Badge>
              )}
            </div>

            {loadingLeaderboard ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-16 bg-muted/30 rounded-xl" />
                ))}
              </div>
            ) : (
              <motion.div variants={containerVariants} className="space-y-3">
                {leaderboardData?.leaderboard.map((entry) => (
                  <LeaderboardRow
                    key={entry.rank}
                    entry={entry}
                    isCurrentUser={entry.username === user?.githubUsername}
                  />
                ))}
                {leaderboardData?.leaderboard.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No referrals yet. Be the first!</p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Custom Code Section */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Custom Referral Code</h3>
                <p className="text-sm text-muted-foreground">Create a memorable code for sharing</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Input
                placeholder="e.g., MYCODE2025"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                maxLength={20}
                className="flex-1 bg-muted/30 border-border/50 font-mono"
              />
              <Button
                onClick={() => createCustomCodeMutation.mutate(customCode)}
                disabled={!customCode || createCustomCodeMutation.isPending}
                className="btn-primary"
              >
                {createCustomCodeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Only letters, numbers, underscores, and hyphens allowed. 3-20 characters.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
