import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { STAGING_API_URL } from '../config';
import { Copy, Gift, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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

interface ReferralWidgetProps {
  compact?: boolean;
}

export function ReferralWidget({ compact = false }: ReferralWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: referralInfo, isLoading } = useQuery<ReferralInfo>({
    queryKey: ['referralInfo'],
    queryFn: async () => {
      const response = await fetch(`${STAGING_API_URL}/api/referral/code`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch referral info');
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const copyCode = async () => {
    if (referralInfo?.code) {
      await navigator.clipboard.writeText(referralInfo.code);
      toast({ title: "Referral code copied!" });
    }
  };

  if (!user) return null;

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-green-500/10 border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-500" />
              <div>
                <div className="font-semibold text-sm">Refer & Earn</div>
                <div className="text-xs text-muted-foreground">
                  {referralInfo?.stats.totalReferrals || 0} referrals | ${referralInfo?.stats.totalUsdcEarned || '0'} earned
                </div>
              </div>
            </div>
            <Link href="/referrals">
              <Button variant="ghost" size="sm">
                View <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-green-500/10 border-purple-500/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-500" />
          <span className="font-semibold">Your Referrals</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-bold">{referralInfo?.stats.totalReferrals || 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div>
            <div className="font-bold text-yellow-500">{referralInfo?.stats.pendingReferrals || 0}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div>
            <div className="font-bold text-green-500">${referralInfo?.stats.totalUsdcEarned || '0'}</div>
            <div className="text-xs text-muted-foreground">Earned</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-background/50 rounded px-3 py-2 font-mono text-sm truncate">
            {isLoading ? '...' : referralInfo?.code}
          </div>
          <Button variant="outline" size="icon" onClick={copyCode} disabled={isLoading}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <Link href="/referrals">
          <Button variant="secondary" className="w-full" size="sm">
            Share Link & View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
