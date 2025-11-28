import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Server, Copy, Cpu, Zap, AlertCircle, Loader2, CheckCircle2, Terminal, Network } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Redirect } from 'wouter';
import { PROOF_OF_COMPUTE_CONTRACT_ADDRESS, XDC_RPC_URL } from '../config';

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

const ProviderHubPage: React.FC = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [nodeStatus, setNodeStatus] = useState('Offline');
  const [computeUnits, setComputeUnits] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const exoRunCommand = user ? `exo run --roxonn-wallet-address ${user.xdcWalletAddress}` : "Loading...";

  const fetchData = async () => {
    if (!user || !user.xdcWalletAddress) return;
    try {
      const computeUnitsResponse = await fetch('/api/node/compute-units');
      if (!computeUnitsResponse.ok) {
        throw new Error('Failed to fetch compute units.');
      }
      const computeUnitsData = await computeUnitsResponse.json();
      setComputeUnits(computeUnitsData.computeUnits);

      const response = await fetch(`/api/node/status?walletAddress=${user.xdcWalletAddress}`);
      const data = await response.json();
      if (response.ok) {
        setNodeStatus(data.status);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch data.');
      console.error(err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
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

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Network className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-400">Compute Provider</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="gradient-text-cyan">Provider Hub</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Run an exo node and earn compute units for contributing to the network
            </p>
          </motion.div>

          {/* Node Status Card */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Node Status</h3>
                  <p className="text-sm text-muted-foreground">Your node connection status</p>
                </div>
              </div>
              <Badge className={nodeStatus === 'Online'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
              }>
                <span className="relative flex h-2 w-2 mr-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${nodeStatus === 'Online' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${nodeStatus === 'Online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                {nodeStatus}
              </Badge>
            </div>

            {isLoadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-violet-400" />
                    <span className="text-sm text-muted-foreground">Compute Units</span>
                  </div>
                  <div className="text-3xl font-bold font-mono text-violet-400">{computeUnits}</div>
                  <p className="text-xs text-muted-foreground mt-1">Earned from blockchain</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-muted-foreground">Status</span>
                  </div>
                  <div className={`text-3xl font-bold ${nodeStatus === 'Online' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {nodeStatus}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Real-time connection</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Command Card */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Quick Start Command</h3>
                <p className="text-sm text-muted-foreground">Run this command to start your node</p>
              </div>
            </div>

            <div className="relative">
              <div className="bg-muted/30 border border-border/50 rounded-xl p-4 font-mono text-sm overflow-x-auto">
                <code className="text-cyan-400">{exoRunCommand}</code>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-2 border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                onClick={() => copyToClipboard(exoRunCommand)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-medium">Instructions:</h4>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold flex-shrink-0">1</span>
                  <span>Install <code className="text-cyan-400 bg-muted/50 px-1.5 py-0.5 rounded">exo</code> on your machine</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold flex-shrink-0">2</span>
                  <span>Copy and run the command above in your terminal</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold flex-shrink-0">3</span>
                  <span>Your node will connect to the Roxonn network automatically</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold flex-shrink-0">4</span>
                  <span>Earn compute units for processing AI tasks</span>
                </li>
              </ol>
            </div>
          </motion.div>

          {/* Wallet Info */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Connected Wallet</h3>
                <p className="text-sm text-muted-foreground">Your rewards wallet address</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                value={user.xdcWalletAddress || ''}
                readOnly
                className="flex-1 bg-muted/30 border-border/50 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                onClick={() => copyToClipboard(user.xdcWalletAddress || '')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400">{error}</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProviderHubPage;
