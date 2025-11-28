import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  Github,
  ArrowRight,
  Zap,
  Shield,
  Coins,
  GitPullRequest,
  Code2,
  Wallet,
  TrendingUp,
  Users,
  Star,
  ChevronDown,
} from "lucide-react";

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref} className="metric-counter">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// Floating orbs background
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--xdc-cyan) / 0.15) 0%, transparent 70%)",
          left: "10%",
          top: "20%",
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--roxn-purple) / 0.12) 0%, transparent 70%)",
          right: "5%",
          bottom: "10%",
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--success-green) / 0.1) 0%, transparent 70%)",
          left: "60%",
          top: "60%",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Grid pattern background
function GridPattern() {
  return (
    <div className="absolute inset-0 grid-pattern opacity-30" />
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const stats = [
    { value: 50000, suffix: "+", label: "XDC Distributed" },
    { value: 120, suffix: "+", label: "Active Repos" },
    { value: 500, suffix: "+", label: "Contributors" },
    { value: 99, suffix: "%", label: "Payout Success" },
  ];

  const features = [
    {
      icon: <GitPullRequest className="w-8 h-8" />,
      title: "Bounty System",
      description: "Assign XDC, ROXN, or USDC bounties to GitHub issues. Contributors earn when PRs are merged.",
      gradient: "from-cyan-500/20 to-cyan-500/5",
    },
    {
      icon: <Wallet className="w-8 h-8" />,
      title: "Instant Wallet",
      description: "Get an XDC wallet automatically on signup. No setup required, start earning immediately.",
      gradient: "from-violet-500/20 to-violet-500/5",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Smart Contracts",
      description: "Trustless payouts via audited smart contracts. Your rewards are guaranteed and secure.",
      gradient: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "XDC Network enables sub-second confirmations with minimal gas fees.",
      gradient: "from-amber-500/20 to-amber-500/5",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div className="relative min-h-screen bg-background noise-bg overflow-hidden">
      <GridPattern />
      <FloatingOrbs />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-4"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <Badge
              variant="outline"
              className="mb-8 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5"
            >
              <span className="mr-2 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live on XDC Mainnet
            </Badge>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
              <span className="block">Code.</span>
              <span className="block">Contribute.</span>
              <span className="block gradient-text-cyan glow-text-cyan">
                Get Paid.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              The decentralized platform where GitHub contributions
              <br className="hidden md:block" />
              become <span className="text-primary font-semibold">real blockchain rewards</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href={user ? "/repos" : "/auth"}>
                <Button
                  size="lg"
                  className="btn-primary text-lg px-8 py-6 rounded-2xl group"
                >
                  <Github className="mr-2 h-5 w-5" />
                  {user ? "Explore Bounties" : "Start Earning"}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/faq">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 rounded-2xl border-border/50 hover:border-primary/50 hover:bg-primary/5"
                >
                  How It Works
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Audited Contracts</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-500" />
                <span>XDC Network</span>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-violet-500" />
                <span>Open Source</span>
              </div>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="data-card text-center card-hover"
              >
                <div className="stat-value text-primary mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4 px-4 py-2 border-border/50">
              Platform Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for <span className="gradient-text-purple">Developers</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to monetize your open source contributions
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className={`feature-card bg-gradient-to-br ${feature.gradient}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-background/50 text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="gradient-text-cyan">Works</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps from code to crypto
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect GitHub",
                description: "Sign in with your GitHub account. Your XDC wallet is created automatically.",
                icon: <Github className="w-6 h-6" />,
              },
              {
                step: "02",
                title: "Find Bounties",
                description: "Browse funded repositories and find issues that match your skills.",
                icon: <TrendingUp className="w-6 h-6" />,
              },
              {
                step: "03",
                title: "Get Paid",
                description: "Submit your PR, get it merged, and receive instant crypto payouts.",
                icon: <Coins className="w-6 h-6" />,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
              >
                <div className="card-noir p-8 h-full">
                  <div className="text-6xl font-bold text-primary/10 mb-4">
                    {item.step}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-border" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card-noir p-12 md:p-16 relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Users className="w-4 h-4" />
                Join 500+ developers earning with code
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Turn Code
                <br />
                <span className="gradient-text-cyan">Into Crypto?</span>
              </h2>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Start earning blockchain rewards for your open source contributions today.
                No wallet setup required.
              </p>

              <Link href={user ? "/repos" : "/auth"}>
                <Button
                  size="lg"
                  className="btn-primary text-lg px-10 py-7 rounded-2xl group pulse-glow"
                >
                  <Github className="mr-2 h-6 w-6" />
                  {user ? "Browse Bounties" : "Get Started Free"}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold gradient-text-purple">ROXONN</span>
              <Badge variant="outline" className="text-xs">Beta</Badge>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/faq" className="hover:text-foreground transition-colors">
                FAQ
              </Link>
              <Link href="/courses" className="hover:text-foreground transition-colors">
                Courses
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>

            <div className="text-sm text-muted-foreground">
              Powered by <span className="text-cyan-500 font-medium">XDC Network</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
