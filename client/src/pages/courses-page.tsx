import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Play, Video, Crown, CheckCircle2, Sparkles, GraduationCap, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { SubscriptionPayButton } from '@/components/subscription-pay-button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Currency {
  fiatType: number;
  code: string;
  symbol: string;
  name: string;
  country: string;
  flag: string;
  usdcRate: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  route: string;
}

const courses: Course[] = [
  {
    id: 'bolt-new',
    title: 'bolt.new',
    description: 'Master rapid prototyping and automation. Build, automate, and launch workflows instantly.',
    duration: '45 minutes',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    route: '/courses/bolt-new',
  },
  {
    id: 'v0-dev',
    title: 'v0.dev',
    description: 'Create stunning UI components and web applications using v0.dev AI-powered tools.',
    duration: '50 minutes',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    route: '/courses/v0-dev',
  },
];

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

// Course Card Component
const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
  return (
    <Link href={course.route}>
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -4 }}
        className="card-noir overflow-hidden cursor-pointer h-full group"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/80 backdrop-blur-sm rounded-full p-4 opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110">
              <Play className="w-8 h-8 text-violet-400 fill-violet-400" />
            </div>
          </div>
          <Badge className="absolute top-4 left-4 bg-violet-500/20 text-violet-400 border-violet-500/30">
            <Video className="w-3 h-3 mr-1" />
            Course
          </Badge>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{course.title}</h3>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {course.duration}
            </div>
          </div>
          <p className="text-muted-foreground text-sm line-clamp-2">
            {course.description}
          </p>
          <Button variant="outline" className="w-full border-border/50 group-hover:border-violet-500/50 group-hover:bg-violet-500/10">
            <BookOpen className="w-4 h-4 mr-2 group-hover:text-violet-400" />
            View Course
          </Button>
        </div>
      </motion.div>
    </Link>
  );
};

// Feature Card Component
function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "cyan" | "violet" | "emerald";
}) {
  const colorClasses = {
    cyan: "bg-cyan-500/10 text-cyan-400",
    violet: "bg-violet-500/10 text-violet-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <motion.div variants={itemVariants} className="text-center">
      <div className={`${colorClasses[color]} p-4 rounded-xl inline-flex mb-3`}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </motion.div>
  );
}

export default function CoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    active: boolean;
    periodEnd?: Date;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [currencies, setCurrencies] = useState<{ popular: Currency[]; all: Currency[] }>({ popular: [], all: [] });
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/api/subscription/currencies');
      const data = response.data || response;

      if (!data || !data.popular || !data.all) {
        throw new Error('Invalid currency data format');
      }

      setCurrencies(data);
      const defaultCurrency = data.popular.find((c: Currency) => c.fiatType === 21) ||
                             data.popular.find((c: Currency) => c.fiatType === 1) ||
                             data.popular[0];
      setSelectedCurrency(defaultCurrency);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      const fallbackCurrencies = [
        { fiatType: 21, code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', flag: '', usdcRate: 1 },
        { fiatType: 1, code: 'INR', symbol: '', name: 'Indian Rupee', country: 'India', flag: '', usdcRate: 85 },
        { fiatType: 12, code: 'EUR', symbol: '', name: 'Euro', country: 'Europe', flag: '', usdcRate: 0.95 },
      ];
      setCurrencies({ popular: fallbackCurrencies, all: fallbackCurrencies });
      setSelectedCurrency(fallbackCurrencies[0]);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/api/subscription/status');
      setSubscriptionStatus(response);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionSuccess = () => {
    fetchSubscriptionStatus();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
              <GraduationCap className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-violet-400">Learning Platform</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="gradient-text-purple">Video Courses</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Master modern development tools with hands-on video tutorials
            </p>
          </motion.div>

          {/* Subscription Status/CTA - Logged in users */}
          {user && !loading && (
            <motion.div
              variants={itemVariants}
              className="card-noir p-6 border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Annual Membership</h3>
                  {subscriptionStatus?.active ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Active - Full access to all courses
                      {subscriptionStatus.periodEnd && (
                        <span className="text-muted-foreground">
                          (Renews {new Date(subscriptionStatus.periodEnd).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Get lifetime access to all courses, mentorship, and premium community features
                    </p>
                  )}
                </div>
              </div>

              {!subscriptionStatus?.active && (
                <div className="space-y-6">
                  {/* Currency Selector */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Select Your Currency</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {(showAllCurrencies ? currencies.all : currencies.popular).map((currency) => (
                        <button
                          key={currency.fiatType}
                          onClick={() => setSelectedCurrency(currency)}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                            selectedCurrency?.fiatType === currency.fiatType
                              ? "border-violet-500 bg-violet-500/10"
                              : "border-border/50 hover:border-violet-500/50 bg-muted/30"
                          )}
                        >
                          <span className="text-lg">{currency.flag}</span>
                          <span className="font-mono text-sm font-medium">{currency.code}</span>
                        </button>
                      ))}
                    </div>
                    {!showAllCurrencies && currencies.all.length > currencies.popular.length && (
                      <button
                        onClick={() => setShowAllCurrencies(true)}
                        className="text-sm text-violet-400 hover:text-violet-300 underline"
                      >
                        Show all {currencies.all.length} currencies
                      </button>
                    )}
                    {showAllCurrencies && (
                      <button
                        onClick={() => setShowAllCurrencies(false)}
                        className="text-sm text-violet-400 hover:text-violet-300 underline"
                      >
                        Show popular currencies only
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Features List */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">What's included:</h4>
                      <ul className="space-y-2">
                        {[
                          'Full access to all video courses',
                          'Mentorship and guidance',
                          'Premium community access',
                          'Training materials & assignments',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Price & CTA */}
                    <div className="space-y-4">
                      <div className="text-center p-6 rounded-xl bg-muted/30 border border-border/50">
                        {selectedCurrency ? (
                          <>
                            <div className="text-4xl font-bold gradient-text-purple">
                              {selectedCurrency.symbol}{Math.ceil(10 * selectedCurrency.usdcRate)}
                            </div>
                            <div className="text-sm text-muted-foreground">{selectedCurrency.code} per year</div>
                            <div className="text-xs text-muted-foreground mt-1">= 10 USDC on Polygon</div>
                          </>
                        ) : (
                          <>
                            <div className="text-4xl font-bold gradient-text-purple">10 USDC</div>
                            <div className="text-sm text-muted-foreground">per year</div>
                          </>
                        )}
                      </div>
                      <SubscriptionPayButton
                        onSuccess={handleSubscriptionSuccess}
                        fiatType={selectedCurrency?.fiatType}
                        currencyDisplay={selectedCurrency ? `Pay ${selectedCurrency.symbol}${Math.ceil(10 * selectedCurrency.usdcRate)} ${selectedCurrency.code}` : undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Guest CTA */}
          {!user && (
            <motion.div
              variants={itemVariants}
              className="card-noir p-8 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 border-violet-500/20"
            >
              <div className="text-center mb-8">
                <div className="inline-flex p-4 rounded-2xl bg-violet-500/10 mb-4">
                  <Crown className="h-10 w-10 text-violet-400" />
                </div>
                <h2 className="text-3xl font-bold mb-3">
                  <span className="gradient-text-purple">Unlock All Courses</span>
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Get instant access to professional development courses and start earning from GitHub bounties
                </p>
                <div className="mt-4">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-lg px-4 py-1">
                    Only $10/year
                  </Badge>
                </div>
              </div>

              <motion.div variants={containerVariants} className="grid md:grid-cols-3 gap-8 mb-8">
                <FeatureCard
                  icon={<Video className="h-6 w-6" />}
                  title="All Courses Included"
                  description="Current & future courses"
                  color="cyan"
                />
                <FeatureCard
                  icon={<BookOpen className="h-6 w-6" />}
                  title="Hands-on Learning"
                  description="Build real projects"
                  color="violet"
                />
                <FeatureCard
                  icon={<Users className="h-6 w-6" />}
                  title="Premium Community"
                  description="Get mentorship & support"
                  color="emerald"
                />
              </motion.div>

              <div className="flex gap-4 justify-center">
                <Button
                  className="btn-primary px-8"
                  onClick={() => window.location.href = '/membership'}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Get Premium Access
                </Button>
                <Button
                  variant="outline"
                  className="border-border/50 hover:border-primary/50"
                  onClick={() => window.location.href = '/auth/signin'}
                >
                  Sign In
                </Button>
              </div>
            </motion.div>
          )}

          {/* Courses Grid */}
          <motion.div variants={containerVariants}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold">Available Courses</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </motion.div>

          {/* Coming Soon */}
          <motion.div variants={itemVariants} className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              More courses coming soon
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
