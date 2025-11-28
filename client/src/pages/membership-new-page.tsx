import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { STAGING_API_URL } from "@/config";
import {
  Crown,
  Check,
  Sparkles,
  BookOpen,
  Coins,
  Shield,
  Zap,
  Award,
  ArrowRight,
  Play,
  Lock,
  Star,
  Users,
  TrendingUp,
  ChevronRight,
  Loader2,
} from "lucide-react";

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

// Feature Item
function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.li variants={itemVariants} className="flex items-start gap-3">
      <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-500 mt-0.5">
        <Check className="w-4 h-4" />
      </div>
      <span>{children}</span>
    </motion.li>
  );
}

// Course Card Component
function CourseCard({
  title,
  description,
  duration,
  lessons,
  image,
  href,
  locked = false,
}: {
  title: string;
  description: string;
  duration: string;
  lessons: number;
  image: string;
  href: string;
  locked?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`group card-noir overflow-hidden ${locked ? "opacity-60" : ""}`}
    >
      {/* Course Image */}
      <div className="relative h-48 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{
            backgroundImage: `url(${image})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <Badge variant="outline">Premium Only</Badge>
            </div>
          </div>
        )}

        {!locked && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <Badge className="bg-primary/90 text-primary-foreground">
              <Play className="w-3 h-3 mr-1" />
              {lessons} Lessons
            </Badge>
            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
              {duration}
            </Badge>
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>

        {locked ? (
          <Button variant="outline" className="w-full" disabled>
            <Lock className="w-4 h-4 mr-2" />
            Unlock with Premium
          </Button>
        ) : (
          <Link href={href}>
            <Button className="w-full btn-primary">
              Start Learning
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// Testimonial Card
function TestimonialCard({
  quote,
  author,
  role,
  avatar,
}: {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}) {
  return (
    <motion.div variants={itemVariants} className="card-noir p-6">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
        ))}
      </div>
      <p className="text-muted-foreground mb-4 italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <img
          src={avatar}
          alt={author}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <p className="font-medium">{author}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function MembershipNewPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      const response = await fetch(`${STAGING_API_URL}/api/subscription/status`, {
        credentials: "include",
      });
      if (!response.ok) return { active: false };
      return response.json();
    },
    enabled: !!user,
  });

  const isPremium = subscriptionStatus?.active;

  const features = [
    "Access to all premium courses (bolt.new, v0.dev & more)",
    "GitHub bounties worth $100 - $5,000 per bounty",
    "Priority support and feature requests",
    "Exclusive community Discord access",
    "Early access to new platform features",
    "Earn while you learn - ROI in just 1 bounty!",
  ];

  const courses = [
    {
      title: "Mastering bolt.new",
      description: "Build full-stack apps with AI in minutes using bolt.new's powerful platform.",
      duration: "3 hours",
      lessons: 12,
      image: "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800",
      href: "/courses/bolt-new",
      locked: !isPremium,
    },
    {
      title: "v0.dev Fundamentals",
      description: "Create beautiful UI components with v0.dev's generative AI design system.",
      duration: "2.5 hours",
      lessons: 10,
      image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800",
      href: "/courses/v0-dev",
      locked: !isPremium,
    },
    {
      title: "Web3 Development",
      description: "Build decentralized applications on XDC Network from scratch.",
      duration: "4 hours",
      lessons: 16,
      image: "https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?auto=compress&cs=tinysrgb&w=800",
      href: "/courses/web3",
      locked: true,
    },
  ];

  const testimonials = [
    {
      quote: "The courses paid for themselves with my first bounty. Amazing ROI!",
      author: "Sarah Chen",
      role: "Full-Stack Developer",
      avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
    },
    {
      quote: "bolt.new course helped me build 3 SaaS products in a month.",
      author: "Alex Kumar",
      role: "Indie Hacker",
      avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200",
    },
    {
      quote: "Premium membership is a no-brainer at this price point.",
      author: "Maria Garcia",
      role: "Software Engineer",
      avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
    },
  ];

  // Handle subscribe
  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = "/auth?returnTo=/membership";
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${STAGING_API_URL}/api/subscription/merchant/init`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to initialize subscription");

      const { paymentUrl } = await response.json();
      window.location.href = paymentUrl;
    } catch (error) {
      console.error("Subscription error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-6 px-4 py-2 bg-amber-500/10 text-amber-500 border-amber-500/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Early Bird Pricing - Limited Time
            </Badge>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6">
              <span className="block">Unlock Your</span>
              <span className="gradient-text-purple">Full Potential</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Premium courses, GitHub bounties, and exclusive features.
              <br />
              <span className="text-primary font-medium">One membership. Unlimited possibilities.</span>
            </p>

            {/* Pricing Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-block"
            >
              <div className="card-noir p-8 relative overflow-hidden max-w-md mx-auto">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-cyan-500 to-violet-500" />

                {isPremium ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                      <Crown className="w-5 h-5" />
                      <span className="font-semibold">Premium Member</span>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      You have full access to all premium features!
                    </p>
                    <Link href="/courses">
                      <Button className="btn-primary">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Browse Courses
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end justify-center gap-2 mb-6">
                      <span className="text-5xl font-bold">$10</span>
                      <span className="text-muted-foreground mb-1">/year</span>
                    </div>

                    <ul className="space-y-3 text-left mb-8">
                      {features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-center gap-3 text-sm">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full btn-primary text-lg py-6 pulse-glow"
                      onClick={handleSubscribe}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Crown className="w-5 h-5 mr-2" />
                      )}
                      {user ? "Get Premium Access" : "Sign In & Subscribe"}
                    </Button>

                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      Secure payment via USDC • Cancel anytime
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {[
              { icon: <Users className="w-5 h-5" />, value: "500+", label: "Premium Members" },
              { icon: <BookOpen className="w-5 h-5" />, value: "15+", label: "Pro Courses" },
              { icon: <Coins className="w-5 h-5" />, value: "$50K+", label: "Bounties Paid" },
              { icon: <TrendingUp className="w-5 h-5" />, value: "10x", label: "Avg ROI" },
            ].map((stat, index) => (
              <motion.div key={index} variants={itemVariants} className="text-center">
                <div className="inline-flex p-3 rounded-xl bg-card border border-border/50 mb-3">
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">
              Everything You <span className="gradient-text-cyan">Need</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Premium membership includes access to all these features
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                icon: <BookOpen className="w-6 h-6" />,
                title: "Premium Courses",
                description: "Learn bolt.new, v0.dev, and more with comprehensive video courses.",
                color: "bg-violet-500/10 text-violet-500",
              },
              {
                icon: <Coins className="w-6 h-6" />,
                title: "GitHub Bounties",
                description: "Access exclusive bounties worth $100 - $5,000 per completion.",
                color: "bg-cyan-500/10 text-cyan-500",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Priority Support",
                description: "Get fast responses and dedicated help from our team.",
                color: "bg-amber-500/10 text-amber-500",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Community Access",
                description: "Join our exclusive Discord with other premium developers.",
                color: "bg-emerald-500/10 text-emerald-500",
              },
              {
                icon: <Award className="w-6 h-6" />,
                title: "Certifications",
                description: "Earn verifiable certificates for completed courses.",
                color: "bg-rose-500/10 text-rose-500",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Lifetime Updates",
                description: "All course updates included at no extra cost.",
                color: "bg-blue-500/10 text-blue-500",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="card-noir p-6 hover:border-primary/30 transition-colors"
              >
                <div className={`inline-flex p-3 rounded-xl ${feature.color} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4">
              <BookOpen className="w-4 h-4 mr-2" />
              Premium Courses
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Learn From the <span className="gradient-text-purple">Best</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Comprehensive courses to boost your development skills
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {courses.map((course, index) => (
              <CourseCard key={index} {...course} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">
              Loved by <span className="gradient-text-cyan">Developers</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              See what our premium members have to say
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card-noir p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="relative z-10">
              <Crown className="w-16 h-16 mx-auto mb-6 text-amber-500" />
              <h2 className="text-4xl font-bold mb-4">
                Ready to Level Up?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join 500+ developers who are earning while they learn.
                <br />
                Premium membership pays for itself with your first bounty.
              </p>

              {!isPremium && (
                <Button
                  size="lg"
                  className="btn-primary text-lg px-10 py-7 rounded-2xl"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Crown className="w-5 h-5 mr-2" />
                  )}
                  Get Premium for $10/year
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
