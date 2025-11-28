import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, GitPullRequest, GitBranch, Star, GitFork, AlertCircle, Loader2, ChevronLeft, Shield, ShieldCheck, ShieldAlert, Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepoRewards } from "@/components/repo-rewards";
import { useState, useEffect } from "react";
import { SetRewardModal } from "@/components/set-reward-modal";
import { blockchainApi } from "@/lib/blockchain";
import type { UnifiedPoolInfo, IssueBountyDetails } from "@shared/schema";
import { ethers } from "ethers";
import { STAGING_API_URL } from '../config';
import { RepoDetailsGuide } from "@/components/welcome-guide";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Repository {
  id: number;
  name: string;
  description: string;
  html_url: string;
  updated_at: string;
  open_issues_count: number;
  full_name: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface Label {
  name: string;
  color: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  labels: Label[];
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
}

interface PullRequest {
  id: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  state: string;
  html_url: string;
}

interface RepoDetailsResponse {
  repo: Repository;
  issues: Issue[];
  pullRequests: PullRequest[];
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

export default function RepoDetailsPage() {
  const [, params] = useRoute("/repos/:owner/:name");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isPoolManager = user?.role === "poolmanager";
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const [issueBountiesMap, setIssueBountiesMap] = useState<Map<number, IssueBountyDetails | { error: string } | null>>(new Map());
  const [isLoadingBounties, setIsLoadingBounties] = useState(false);
  const [bountyUpdateCounter, setBountyUpdateCounter] = useState(0);

  const [hasAdminPermission, setHasAdminPermission] = useState<boolean | null>(null);
  const repoFullName = params?.owner && params?.name ? `${params.owner}/${params.name}` : '';

  const { data: githubData, isLoading: isLoadingGithubData, error: githubError } = useQuery<RepoDetailsResponse>({
    queryKey: ["repo-details", params?.owner, params?.name],
    queryFn: async () => {
      if (!params?.owner || !params?.name) {
        throw new Error("Repository owner and name are required");
      }
      const response = await fetch(
        `${STAGING_API_URL}/api/github/repos/${params.owner}/${params.name}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch repository details from GitHub");
      }
      return await response.json();
    },
    enabled: !!params?.owner && !!params?.name,
    retry: false
  });

  const repoId = githubData?.repo?.id;

  useEffect(() => {
    if (githubData?.repo?.permissions) {
      setHasAdminPermission(githubData.repo.permissions.admin);
    }
  }, [githubData]);

  const { data: poolInfo, isLoading: isLoadingPoolInfo, refetch: refetchPoolInfo } = useQuery<UnifiedPoolInfo | null>({
    queryKey: ["poolInfo", repoId],
    queryFn: async () => {
      if (!repoId) return null;
      return blockchainApi.getPoolInfo(repoId);
    },
    enabled: !!repoId,
  });

  useEffect(() => {
    const fetchBounties = async () => {
      if (githubData?.issues && repoId) {
        setIsLoadingBounties(true);
        const openGitHubIssues = githubData.issues.filter(
          (issue) => issue.state === 'open' && !issue.html_url.includes('/pull/')
        );

        const promises = openGitHubIssues.map(ghIssue => {
          if (typeof ghIssue.number !== 'number' || isNaN(ghIssue.number)) {
            console.error(`Invalid or missing issue number for GitHub issue ID ${ghIssue.id}. Received: ${ghIssue.number}`);
            return Promise.resolve({ githubIssueGlobalId: ghIssue.id, details: null, error: 'Invalid issue number' });
          }
          return blockchainApi.getIssueBountyDetails(repoId, ghIssue.number)
            .then(details => ({ githubIssueGlobalId: ghIssue.id, details, error: null }))
            .catch(error => {
              console.error(`Failed to fetch bounty for GitHub issue ${ghIssue.id} (number ${ghIssue.number}):`, error);
              return { githubIssueGlobalId: ghIssue.id, details: null, error: (error as Error).message || 'API call failed' };
            })
        });

        const results = await Promise.allSettled(promises);
        const newBountiesMap = new Map<number, IssueBountyDetails | { error: string } | null>();
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            if (result.value.error) {
              newBountiesMap.set(result.value.githubIssueGlobalId, { error: result.value.error });
            } else {
              newBountiesMap.set(result.value.githubIssueGlobalId, result.value.details);
            }
          } else if (result.status === 'rejected') {
            console.error(`Promise rejected for an issue:`, result.reason);
          }
        });
        setIssueBountiesMap(newBountiesMap);
        setIsLoadingBounties(false);
      }
    };
    fetchBounties();
  }, [githubData?.issues, repoId, bountyUpdateCounter]);

  const handleContribute = async (issueId: number) => {
    if (!user) {
      const currentUrl = window.location.pathname;
      const normalizedReturnTo = currentUrl.startsWith('/') ? currentUrl : `/${currentUrl}`;
      const returnUrl = encodeURIComponent(normalizedReturnTo);
      window.location.href = `${STAGING_API_URL}/api/auth/github?returnTo=${returnUrl}`;
      return;
    }
    try {
      const roleResponse = await fetch(`${STAGING_API_URL}/api/user/role`, { credentials: 'include' });
      const { role } = await roleResponse.json();
      if (!role) {
        toast({
          title: "Role Selection Required",
          description: "Please select your role as Pool Manager or Contributor",
          action: (
            <div className="flex gap-2">
              <Button onClick={() => window.location.href = `/register/pool-manager?issueId=${issueId}`} variant="default">Pool Manager</Button>
              <Button onClick={() => window.location.href = `/register/contributor?issueId=${issueId}`} variant="outline">Contributor</Button>
            </div>
          )
        });
        return;
      }
      const walletResponse = await fetch(`${STAGING_API_URL}/api/wallet`, { method: 'POST', credentials: 'include' });
      const { address } = await walletResponse.json();
      const contractResponse = await fetch(`${STAGING_API_URL}/api/blockchain/register`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, walletAddress: address, issueId })
      });
      if (!contractResponse.ok) throw new Error('Failed to register with smart contract');
      toast({ title: "Success!", description: "You're now registered to contribute to this issue." });
    } catch (error) {
      console.error('Contribution error:', error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to process contribution", variant: "destructive" });
    }
  };

  const handleSetReward = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  const handleModalClose = () => {
    setSelectedIssue(null);
  };

  const handleRewardSuccess = () => {
    refetchPoolInfo();
    if (selectedIssue && repoId) {
      blockchainApi.getIssueBountyDetails(repoId, selectedIssue.number).then(details => {
        setIssueBountiesMap(prevMap => new Map(prevMap).set(selectedIssue.id, details));
        setBountyUpdateCounter(prev => prev + 1);
      });
    } else {
      setBountyUpdateCounter(prev => prev + 1);
    }
    queryClient.invalidateQueries({ queryKey: ['poolInfo', repoId] });
    if (selectedIssue) {
      queryClient.invalidateQueries({ queryKey: ['issueBountyDetails', repoId, selectedIssue.number] });
    }
  };

  if (isLoadingGithubData || (repoId && isLoadingPoolInfo)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (githubError || !githubData) {
    return (
      <div className="min-h-screen bg-background noise-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-noir p-6 flex items-center gap-3 text-red-400"
        >
          <AlertCircle className="h-5 w-5" />
          <span>{githubError instanceof Error ? githubError.message : "Failed to load repository"}</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="card-noir overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link href="/repos">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{githubData.repo.name}</h1>
                      <p className="text-sm text-muted-foreground">{githubData.repo.full_name}</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/10" asChild>
                  <a href={githubData.repo.html_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View on GitHub
                  </a>
                </Button>
              </div>
              {githubData.repo.description && (
                <p className="mt-4 text-muted-foreground">{githubData.repo.description}</p>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="issues" className="w-full">
              <div className="px-6 py-3 bg-muted/30 border-b border-border/50">
                <TabsList className="bg-transparent gap-2">
                  <TabsTrigger value="issues" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 rounded-lg">
                    <GitPullRequest className="mr-2 h-4 w-4" /> Issues
                  </TabsTrigger>
                  <TabsTrigger value="pull-requests" className="data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400 rounded-lg">
                    <GitFork className="mr-2 h-4 w-4" /> Pull Requests
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 rounded-lg">
                    <Star className="mr-2 h-4 w-4" /> Rewards
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="issues" className="p-6">
                <RepoDetailsGuide />
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Title</TableHead>
                        <TableHead className="text-muted-foreground">Issue #</TableHead>
                        <TableHead className="text-muted-foreground">Labels</TableHead>
                        <TableHead className="text-muted-foreground">Reward</TableHead>
                        <TableHead className="text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingBounties && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                            <p className="text-sm text-muted-foreground mt-2">Loading bounties...</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {!isLoadingBounties && githubData.issues
                        .filter(issue => issue.state === 'open' && !issue.html_url.includes('/pull/'))
                        .map((githubIssue: Issue) => {
                          const issueNumber = githubIssue.number;
                          const bountyData = issueBountiesMap.get(githubIssue.id);

                          let rewardDisplay = "0.0 XDC";
                          let hasBounty = false;
                          let fetchError: string | null = null;
                          let rewardColor = "text-muted-foreground";

                          if (bountyData && typeof bountyData === 'object' && 'error' in bountyData && bountyData.error) {
                            fetchError = bountyData.error;
                            rewardDisplay = "Error";
                          } else if (bountyData) {
                            const issueBountyDetail = bountyData as IssueBountyDetails | null;
                            if (issueBountyDetail) {
                              const xdcAmount = parseFloat(issueBountyDetail.xdcAmount || "0");
                              const roxnAmount = parseFloat(issueBountyDetail.roxnAmount || "0");
                              const usdcAmount = parseFloat(issueBountyDetail.usdcAmount || "0");

                              if (usdcAmount > 0) {
                                rewardDisplay = `${issueBountyDetail.usdcAmount || '0.0'} USDC`;
                                hasBounty = true;
                                rewardColor = "text-blue-400";
                              } else if (issueBountyDetail.isRoxn && roxnAmount > 0) {
                                rewardDisplay = `${issueBountyDetail.roxnAmount || '0.0'} ROXN`;
                                hasBounty = true;
                                rewardColor = "text-violet-400";
                              } else if (roxnAmount > 0) {
                                rewardDisplay = `${issueBountyDetail.roxnAmount || '0.0'} ROXN`;
                                hasBounty = true;
                                rewardColor = "text-violet-400";
                              } else if (!issueBountyDetail.isRoxn && xdcAmount > 0) {
                                rewardDisplay = `${issueBountyDetail.xdcAmount || '0.0'} XDC`;
                                hasBounty = true;
                                rewardColor = "text-cyan-400";
                              } else if (xdcAmount > 0) {
                                rewardDisplay = `${issueBountyDetail.xdcAmount || '0.0'} XDC`;
                                hasBounty = true;
                                rewardColor = "text-cyan-400";
                              }
                            }
                          }

                          return (
                            <TableRow key={githubIssue.id} className="border-border/50 hover:bg-muted/30">
                              <TableCell>
                                <a href={githubIssue.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-medium text-cyan-400 hover:text-cyan-300">
                                  <GitPullRequest className="h-4 w-4 flex-shrink-0" />
                                  <span className="line-clamp-1">{githubIssue.title}</span>
                                </a>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">#{issueNumber === undefined ? githubIssue.id : issueNumber}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {githubIssue.labels.slice(0, 3).map((label: Label) => (
                                    <Badge key={label.name} className="text-xs" style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}`, borderColor: `#${label.color}40` }}>
                                      {label.name}
                                    </Badge>
                                  ))}
                                  {githubIssue.labels.length > 3 && (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">+{githubIssue.labels.length - 3}</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className={`flex items-center gap-1.5 text-sm font-mono ${rewardColor}`}>
                                  {fetchError ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertCircle className="h-4 w-4 text-red-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Error: {typeof fetchError === 'string' ? fetchError.substring(0,100) : 'Unknown error'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <Star className={`h-4 w-4 ${hasBounty ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                                  )}
                                  <span>{rewardDisplay}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" className="border-border/50 hover:border-cyan-500/50 text-xs" asChild>
                                    <a href={githubIssue.html_url} target="_blank" rel="noopener noreferrer">View</a>
                                  </Button>
                                  {isPoolManager && (
                                    <Button size="sm" className="btn-primary text-xs" onClick={() => handleSetReward(githubIssue)}>Set Reward</Button>
                                  )}
                                  {!isPoolManager && user?.role !== 'contributor' && (
                                    <Button size="sm" className="btn-primary text-xs" onClick={() => handleContribute(githubIssue.id)}>Contribute</Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {!isLoadingBounties && githubData.issues.filter(issue => issue.state === 'open' && !issue.html_url.includes('/pull/')).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <GitPullRequest className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No open issues found</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="pull-requests" className="p-6">
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Title</TableHead>
                        <TableHead className="text-muted-foreground">Author</TableHead>
                        <TableHead className="text-muted-foreground">Created</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {githubData.pullRequests?.length > 0 ? (
                        githubData.pullRequests.map((pr) => (
                          <TableRow key={pr.id} className="border-border/50 hover:bg-muted/30">
                            <TableCell>
                              <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-medium text-violet-400 hover:text-violet-300">
                                <GitPullRequest className="h-4 w-4 flex-shrink-0" />
                                <span className="line-clamp-1">{pr.title}</span>
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <img src={pr.user.avatar_url} alt={pr.user.login} className="h-6 w-6 rounded-full" />
                                <span className="text-sm">{pr.user.login}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge className={pr.state === 'open' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-violet-500/20 text-violet-400 border-violet-500/30'}>
                                {pr.state}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" className="border-border/50 hover:border-violet-500/50 text-xs" asChild>
                                <a href={pr.html_url} target="_blank" rel="noopener noreferrer">View</a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <GitFork className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No pull requests found</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="rewards" className="p-6">
                <div className="card-noir p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Coins className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Repository Funding</h3>
                        <p className="text-sm text-muted-foreground">
                          {hasAdminPermission ? 'You have admin permissions for this repository.' : 'You need admin permissions to fund this repository.'}
                        </p>
                      </div>
                    </div>
                    {hasAdminPermission !== null && (
                      <Badge className={hasAdminPermission ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>
                        {hasAdminPermission ? (<><ShieldCheck className="h-3 w-3 mr-1" />Admin Access</>) : (<><ShieldAlert className="h-3 w-3 mr-1" />No Admin Access</>)}
                      </Badge>
                    )}
                  </div>
                  {repoId && (
                    <RepoRewards
                      repoId={repoId}
                      isPoolManager={isPoolManager}
                      repositoryFullName={repoFullName}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>

      {selectedIssue && repoId && (
        <SetRewardModal
          isOpen={!!selectedIssue}
          onClose={handleModalClose}
          issue={{
            id: selectedIssue.number,
            title: selectedIssue.title
          }}
          repoId={repoId}
          currentXdcPool={poolInfo?.xdcPoolRewards || "0.0"}
          currentRoxnPool={poolInfo?.roxnPoolRewards || "0.0"}
          currentUsdcPool={poolInfo?.usdcPoolRewards || "0.0"}
          onSuccess={handleRewardSuccess}
          githubRepoFullName={repoFullName}
          issueUrl={selectedIssue.html_url}
        />
      )}
    </div>
  );
}
