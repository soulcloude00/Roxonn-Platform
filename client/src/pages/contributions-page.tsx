import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect, Link } from "wouter";
import { STAGING_API_URL } from "@/config";
import { formatDistanceToNow } from "date-fns";
import {
  GitPullRequest,
  GitMerge,
  Check,
  Clock,
  XCircle,
  TrendingUp,
  Coins,
  Zap,
  Award,
  Calendar,
  ExternalLink,
  RefreshCw,
  Filter,
  ArrowUpRight,
  GitBranch,
  Target,
  Flame,
  ChevronRight,
} from "lucide-react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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

// Stat Card
function StatCard({
  icon,
  label,
  value,
  subValue,
  color = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: "cyan" | "purple" | "green" | "amber" | "primary";
}) {
  const colorClasses = {
    cyan: "text-cyan-500 bg-cyan-500/10",
    purple: "text-violet-500 bg-violet-500/10",
    green: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    primary: "text-primary bg-primary/10",
  };

  return (
    <motion.div variants={itemVariants} className="card-noir p-6">
      <div className={`inline-flex p-3 rounded-xl ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <p className="stat-label mb-1">{label}</p>
      <p className="stat-value">{value}</p>
      {subValue && <p className="text-sm text-muted-foreground mt-1">{subValue}</p>}
    </motion.div>
  );
}

// Contribution Item
function ContributionItem({
  repo,
  title,
  status,
  reward,
  currency,
  date,
  prNumber,
  issueNumber,
}: {
  repo: string;
  title: string;
  status: "merged" | "pending" | "closed" | "open";
  reward?: string;
  currency?: string;
  date: string;
  prNumber?: number;
  issueNumber?: number;
}) {
  const statusConfig = {
    merged: {
      icon: <GitMerge className="w-4 h-4" />,
      label: "Merged",
      class: "bg-violet-500/10 text-violet-500 border-violet-500/30",
    },
    pending: {
      icon: <Clock className="w-4 h-4" />,
      label: "Pending",
      class: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    },
    closed: {
      icon: <XCircle className="w-4 h-4" />,
      label: "Closed",
      class: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    },
    open: {
      icon: <GitPullRequest className="w-4 h-4" />,
      label: "Open",
      class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      variants={itemVariants}
      className="group flex items-start gap-4 p-4 rounded-xl hover:bg-card/50 transition-colors"
    >
      <div className={`p-2 rounded-lg ${config.class.split(" ")[0]}`}>
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="min-w-0">
            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
              {title}
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{repo}</span>
              {prNumber && <span>PR #{prNumber}</span>}
              {issueNumber && <span>Issue #{issueNumber}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {reward && currency && (
              <Badge variant="outline" className="font-mono badge-xdc">
                +{reward} {currency}
              </Badge>
            )}
            <Badge variant="outline" className={config.class}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {date}
          </span>
          <a
            href={`https://github.com/${repo}/pull/${prNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          >
            <ExternalLink className="w-3 h-3" />
            View on GitHub
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// Streak Component
function StreakDisplay({ currentStreak, longestStreak }: { currentStreak: number; longestStreak: number }) {
  return (
    <motion.div variants={itemVariants} className="card-noir p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Contribution Streak</h3>
            <p className="text-sm text-muted-foreground">Keep the momentum going!</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-background/50">
            <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
            <p className="text-3xl font-bold text-amber-500">{currentStreak} days</p>
          </div>
          <div className="p-4 rounded-xl bg-background/50">
            <p className="text-sm text-muted-foreground mb-1">Longest Streak</p>
            <p className="text-3xl font-bold text-muted-foreground">{longestStreak} days</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Achievement Badge Component
function AchievementBadge({
  icon,
  title,
  description,
  unlocked,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`p-4 rounded-xl border transition-all duration-300 ${
        unlocked
          ? "bg-card border-primary/30 hover:border-primary/50"
          : "bg-muted/30 border-border/30 opacity-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {unlocked && <Check className="w-5 h-5 text-emerald-500 ml-auto" />}
      </div>
    </motion.div>
  );
}

export default function ContributionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">("all");

  // Auth redirect
  if (!authLoading && !user) {
    return <Redirect to="/auth" />;
  }

  // Mock data - in production, fetch from API
  const stats = {
    totalContributions: 47,
    totalEarned: 2450,
    mergedPRs: 23,
    pendingRewards: 350,
    currentStreak: 7,
    longestStreak: 14,
  };

  const contributions = [
    {
      repo: "roxonn/MediSync",
      title: "Fix authentication bug in patient portal",
      status: "merged" as const,
      reward: "150",
      currency: "XDC",
      date: "2 hours ago",
      prNumber: 234,
    },
    {
      repo: "roxonn/FarmSense",
      title: "Add dark mode support to dashboard",
      status: "pending" as const,
      reward: "100",
      currency: "XDC",
      date: "1 day ago",
      prNumber: 89,
    },
    {
      repo: "roxonn/AlertDrive",
      title: "Implement real-time notification system",
      status: "open" as const,
      date: "3 days ago",
      prNumber: 156,
      issueNumber: 78,
    },
    {
      repo: "roxonn/OceanGuardian",
      title: "Optimize database queries for analytics",
      status: "merged" as const,
      reward: "200",
      currency: "XDC",
      date: "1 week ago",
      prNumber: 45,
    },
  ];

  const achievements = [
    {
      icon: <Target className="w-5 h-5" />,
      title: "First Contribution",
      description: "Complete your first bounty",
      unlocked: true,
    },
    {
      icon: <Flame className="w-5 h-5" />,
      title: "On Fire",
      description: "7-day contribution streak",
      unlocked: true,
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: "Crypto Earner",
      description: "Earn 1000+ XDC from contributions",
      unlocked: true,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Rising Star",
      description: "Complete 10 bounties",
      unlocked: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background noise-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Your <span className="gradient-text-purple">Contributions</span>
            </h1>
            <p className="text-muted-foreground">
              Track your GitHub contributions and earned rewards
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/repos">
              <Button variant="outline">
                <GitBranch className="w-4 h-4 mr-2" />
                Find Bounties
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={<GitPullRequest className="w-5 h-5" />}
            label="Total Contributions"
            value={stats.totalContributions}
            subValue="All time"
            color="primary"
          />
          <StatCard
            icon={<Coins className="w-5 h-5" />}
            label="Total Earned"
            value={`${stats.totalEarned} XDC`}
            color="cyan"
          />
          <StatCard
            icon={<GitMerge className="w-5 h-5" />}
            label="Merged PRs"
            value={stats.mergedPRs}
            color="purple"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Pending Rewards"
            value={`${stats.pendingRewards} XDC`}
            subValue="Awaiting merge"
            color="amber"
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Contributions List - Larger Column */}
          <motion.div
            className="lg:col-span-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="card-noir">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <GitPullRequest className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold">Recent Contributions</h2>
                  </div>

                  <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
                    <TabsList className="bg-muted/50">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="month">Month</TabsTrigger>
                      <TabsTrigger value="week">Week</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="p-4 space-y-2">
                {contributions.length > 0 ? (
                  contributions.map((contribution, index) => (
                    <ContributionItem key={index} {...contribution} />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <GitPullRequest className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">No contributions yet</p>
                    <Link href="/repos">
                      <Button>
                        Find Bounties
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {contributions.length > 0 && (
                <div className="p-4 border-t border-border/50">
                  <Button variant="ghost" className="w-full">
                    View All Contributions
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Sidebar - Smaller Column */}
          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Streak Card */}
            <StreakDisplay
              currentStreak={stats.currentStreak}
              longestStreak={stats.longestStreak}
            />

            {/* Achievements */}
            <motion.div variants={itemVariants} className="card-noir p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Achievements</h3>
              </div>

              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <AchievementBadge key={index} {...achievement} />
                ))}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={itemVariants} className="card-noir p-6">
              <h3 className="font-semibold mb-4">This Month</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Contributions</span>
                  <span className="font-mono font-semibold">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Earned</span>
                  <span className="font-mono font-semibold text-cyan-500">650 XDC</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Days</span>
                  <span className="font-mono font-semibold">18</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
