// Add webkit interface declaration at file top level
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        vscode?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, UserCircle2, Gift, Code2, Zap, Shield, ArrowRight, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { STAGING_API_URL } from "../config";
import { useToast } from "@/hooks/use-toast";

type UserRole = "contributor" | "poolmanager";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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

// GitHub Icon component (avoiding deprecated import)
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [role, setRole] = useState<UserRole>("contributor");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGitHubRedirecting, setIsGitHubRedirecting] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const { toast } = useToast();

  const returnTo = new URLSearchParams(window.location.search).get("returnTo") || "/dashboard";
  const isRegistration = new URLSearchParams(window.location.search).get("registration") === "true";
  const source = new URLSearchParams(window.location.search).get("source");
  const isVSCodeAuth = source === "vscode";
  const fromVSCodeOnboarding = new URLSearchParams(window.location.search).get("from_vscode") === "true";

  // Debug log for authentication state tracking
  useEffect(() => {
    if (isVSCodeAuth) {
      console.log('VSCode auth detected from URL parameter');
      localStorage.setItem('authSource', 'vscode');
    }
  }, [isVSCodeAuth]);

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    if (refCode) {
      sessionStorage.setItem('referralCode', refCode);
      setReferralCode(refCode);
    } else {
      const storedCode = sessionStorage.getItem('referralCode');
      if (storedCode) {
        setReferralCode(storedCode);
      }
    }
  }, []);

  useEffect(() => {
    console.log('Auth state check:', {
      user: !!user,
      isProfileComplete: user?.isProfileComplete,
      isRegistration,
      isVSCodeAuth,
      authSource: localStorage.getItem('authSource')
    });

    if (user?.isProfileComplete && !isRegistration) {
      const authSourceFromLocalStorage = localStorage.getItem('authSource');

      if (isVSCodeAuth || authSourceFromLocalStorage === 'vscode') {
        const vscodeAuthAttemptTimestamp = sessionStorage.getItem('vscodeAuthAttemptTimestamp');
        const now = Date.now();

        if (vscodeAuthAttemptTimestamp && (now - parseInt(vscodeAuthAttemptTimestamp, 10) < 10000)) {
          console.log('AuthPage: VSCode auth recently attempted. Redirecting to /vscode/wallet to avoid loop.');
          sessionStorage.removeItem('vscodeAuthAttemptTimestamp');
          setLocation('/vscode/wallet');
          return;
        }

        console.log('AuthPage: VSCode auth flow for an already web-authenticated user. Re-initiating server auth to get VSCode JWT.');
        localStorage.removeItem('authSource');
        sessionStorage.setItem('vscodeAuthAttemptTimestamp', now.toString());

        const serverAuthUrl = `/api/auth/github?source=vscode&returnTo=${encodeURIComponent('/repos')}&prompt=none`;
        window.location.href = serverAuthUrl;

      } else {
        setLocation(returnTo);
      }
    }
  }, [user, setLocation, returnTo, isRegistration, isVSCodeAuth]);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role,
          email: user?.email
        }),
      });

      if (response.success) {
        const storedRefCode = sessionStorage.getItem('referralCode');
        if (storedRefCode) {
          try {
            const refResponse = await fetch(`${STAGING_API_URL}/api/referral/apply`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: storedRefCode }),
              credentials: 'include'
            });

            if (refResponse.ok) {
              const refData = await refResponse.json();
              toast({
                title: "Referral Applied!",
                description: `You were referred by ${refData.referrer}. You'll both earn rewards!`
              });
            }
          } catch (refError) {
            // Silently fail
          } finally {
            sessionStorage.removeItem('referralCode');
          }
        }

        if (fromVSCodeOnboarding) {
          const finalizeUrl = `${STAGING_API_URL}/api/auth/vscode/finalize-onboarding`;
          console.log(`VSCode web onboarding complete, redirecting to backend for finalization: ${finalizeUrl}`);
          window.location.href = finalizeUrl;
        } else {
          console.log(`Standard web onboarding complete, redirecting to: ${returnTo}`);
          window.location.href = returnTo;
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      let errorMessage = "There was an error during registration. Please try again later.";

      if (error.message) {
        if (error.message.includes("User already has a wallet")) {
          errorMessage = "User already has a wallet address registered.";
        } else if (error.message.includes("Failed to register on blockchain")) {
          errorMessage = "Failed to register on the blockchain. Please try again.";
        }
      }

      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGitHubLogin = () => {
    setIsGitHubRedirecting(true);
    if (isVSCodeAuth) {
      localStorage.setItem('authSource', 'vscode');
      const authUrl = `/api/auth/github?source=vscode&returnTo=${encodeURIComponent('/repos')}`;
      window.location.href = authUrl;
      try {
        window.parent.postMessage({ type: 'roxonn-auth-started' }, '*');
      } catch (e) {
        console.error('[VSCode Auth] Could not post message to parent window:', e);
      }
    } else {
      const normalizedReturnTo = returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
      const returnUrl = encodeURIComponent(normalizedReturnTo);
      const authUrl = `${STAGING_API_URL}/api/auth/github?returnTo=${returnUrl}`;
      window.location.href = authUrl;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-noir p-8 flex items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg">Loading...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <h1 className="text-4xl font-bold mb-2">
              <span className="gradient-text-purple">ROXONN</span>
            </h1>
            <p className="text-muted-foreground">
              {!user
                ? "Connect your GitHub to start earning"
                : !user.isProfileComplete
                ? "Choose your role to get started"
                : "Welcome back!"}
            </p>
          </motion.div>

          {/* Main Card */}
          <motion.div variants={itemVariants} className="card-noir p-8">
            {/* Referral Banner */}
            {referralCode && !user?.isProfileComplete && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-6"
              >
                <Gift className="w-5 h-5 text-violet-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-violet-400">You were referred!</p>
                  <p className="text-sm text-muted-foreground">Complete registration and earn bonus rewards.</p>
                </div>
              </motion.div>
            )}

            {/* Not Logged In - Show GitHub Login */}
            {!user ? (
              <div className="space-y-6">
                <Button
                  size="lg"
                  className="w-full btn-primary text-lg py-6 group"
                  onClick={handleGitHubLogin}
                  disabled={isGitHubRedirecting}
                >
                  {isGitHubRedirecting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <GitHubIcon className="mr-2 h-5 w-5" />
                      Continue with GitHub
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>

                {/* Features */}
                <div className="grid gap-3 pt-4">
                  {[
                    { icon: <Zap className="w-4 h-4" />, text: "Instant XDC wallet creation" },
                    { icon: <Code2 className="w-4 h-4" />, text: "Earn crypto for contributions" },
                    { icon: <Shield className="w-4 h-4" />, text: "Secure blockchain payouts" },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        {feature.icon}
                      </div>
                      {feature.text}
                    </div>
                  ))}
                </div>
              </div>
            ) : !user.isProfileComplete ? (
              /* Logged In But Profile Incomplete - Show Role Selection */
              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                  <div className="relative">
                    <img
                      src={user.avatarUrl || ""}
                      alt={user.name || "User"}
                      className="h-14 w-14 rounded-full ring-2 ring-primary/50"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">@{user.githubUsername}</p>
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Select Your Role
                  </h4>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as UserRole)}
                    className="space-y-3"
                  >
                    <Label
                      htmlFor="contributor"
                      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                        role === "contributor"
                          ? "border-cyan-500/50 bg-cyan-500/10"
                          : "border-border/50 hover:border-border hover:bg-card/50"
                      }`}
                    >
                      <RadioGroupItem value="contributor" id="contributor" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Contributor</span>
                          <Badge variant="outline" className="badge-xdc text-xs">Earn XDC</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Work on bounties and get paid in crypto when PRs are merged.
                        </p>
                      </div>
                    </Label>

                    <Label
                      htmlFor="poolmanager"
                      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                        role === "poolmanager"
                          ? "border-violet-500/50 bg-violet-500/10"
                          : "border-border/50 hover:border-border hover:bg-card/50"
                      }`}
                    >
                      <RadioGroupItem value="poolmanager" id="poolmanager" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Pool Manager</span>
                          <Badge variant="outline" className="badge-roxn text-xs">Fund Repos</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Fund repositories and reward contributors for their work.
                        </p>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {/* Register Button */}
                <Button
                  size="lg"
                  className="w-full btn-primary text-lg py-6"
                  disabled={isRegistering || !user?.email}
                  onClick={handleRegister}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Wallet...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-5 w-5" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Profile Complete - Show Success */
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
                >
                  <Check className="w-8 h-8 text-emerald-500" />
                </motion.div>

                <div>
                  <h3 className="text-xl font-bold mb-2">Welcome to Roxonn!</h3>
                  <p className="text-muted-foreground">Your account is ready.</p>
                </div>

                {user.xdcWalletAddress && (
                  <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Your XDC Wallet</p>
                    <code className="text-sm font-mono break-all text-primary">
                      {user.xdcWalletAddress}
                    </code>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full btn-primary"
                  onClick={() => setLocation(returnTo)}
                >
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </motion.div>

          {/* Footer */}
          <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground">
            Powered by <span className="text-cyan-500 font-medium">XDC Network</span>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
