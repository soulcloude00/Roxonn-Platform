import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/use-auth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, FileDown, CheckCircle2, Send, Play, Lock, Zap, ArrowLeft } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import { Link } from 'wouter';

interface VideoUrls {
  shortVideoUrl: string;
  shortVideoDuration: number;
  longVideoUrl: string;
  longVideoDuration?: number;
  poster: string;
  hasAccess: boolean;
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

const BoltNewCoursePage = () => {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [videoUrls, setVideoUrls] = useState<VideoUrls | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [isShowingPreview, setIsShowingPreview] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/auth/signin?returnTo=/courses/bolt-new', { replace: true });
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (user) {
      const fetchVideos = async () => {
        try {
          const response = await fetch('/api/courses/bolt-new/videos', {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch videos');
          }

          const data = await response.json();
          setVideoUrls({
            shortVideoUrl: data.shortVideoUrl,
            shortVideoDuration: data.shortVideoDuration,
            longVideoUrl: data.longVideoUrl || data.shortVideoUrl,
            longVideoDuration: data.longVideoDuration,
            poster: data.poster,
            hasAccess: data.hasAccess,
          });

          const startingSrc = data.longVideoUrl || data.shortVideoUrl;
          setCurrentVideoSrc(startingSrc);
          setIsShowingPreview(startingSrc === data.shortVideoUrl);
          setLoadingVideos(false);
        } catch (error) {
          console.error('Error fetching videos:', error);
          setLoadingVideos(false);
        }
      };

      fetchVideos();
    }
  }, [user]);

  if (loading || loadingVideos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !videoUrls) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const link = formData.get('assignmentLink') as string;

    if (!link) {
      alert('Please enter your assignment link.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/submit-assignment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: 'bolt.new', link }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        (e.currentTarget.elements.namedItem('assignmentLink') as HTMLInputElement).value = '';
        setTimeout(() => setSubmitSuccess(false), 5000);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit assignment.');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Back Link */}
          <motion.div variants={itemVariants}>
            <Link href="/courses">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-400">Course</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="gradient-text-cyan">bolt.new</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Master rapid prototyping and automation with bolt.new
            </p>
          </motion.div>

          {/* Video Player Card */}
          <motion.div variants={itemVariants} className="card-noir overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Play className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Course Video</h3>
                    <p className="text-sm text-muted-foreground">
                      Adjustable playback speed, skip forward/back
                    </p>
                  </div>
                </div>
                {videoUrls.hasAccess ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Full Access
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <Lock className="h-3 w-3 mr-1" />
                    Preview Only
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <VideoPlayer
                src={currentVideoSrc}
                poster={videoUrls.poster}
                maxDuration={isShowingPreview ? videoUrls.shortVideoDuration : undefined}
                isPreview={isShowingPreview}
                onPreviewEnd={() => {
                  if (!videoUrls.hasAccess) {
                    setShowSubscriptionPrompt(true);
                  }
                }}
              />

              {/* Subscription prompt */}
              {showSubscriptionPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-violet-500/10 border border-violet-500/20"
                >
                  <span className="text-violet-300">
                    Preview ended. Subscribe to watch the full course!
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setLocation('/courses')}
                    className="btn-primary"
                  >
                    Subscribe Now
                  </Button>
                </motion.div>
              )}

              {/* Video Selection */}
              <div className="flex gap-3">
                <Button
                  variant={currentVideoSrc === videoUrls.longVideoUrl ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (videoUrls.hasAccess) {
                      setCurrentVideoSrc(videoUrls.longVideoUrl);
                      setIsShowingPreview(false);
                      setShowSubscriptionPrompt(false);
                    } else {
                      setLocation('/courses');
                    }
                  }}
                  disabled={!videoUrls.hasAccess}
                  className={currentVideoSrc === videoUrls.longVideoUrl ? 'btn-primary' : 'border-border/50'}
                >
                  Full Course {!videoUrls.hasAccess && <Lock className="h-3 w-3 ml-1" />}
                </Button>
                <Button
                  variant={currentVideoSrc === videoUrls.shortVideoUrl ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setCurrentVideoSrc(videoUrls.shortVideoUrl);
                    setIsShowingPreview(true);
                    setShowSubscriptionPrompt(false);
                  }}
                  className={currentVideoSrc === videoUrls.shortVideoUrl ? 'btn-primary' : 'border-border/50'}
                >
                  Preview (30s)
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Resources Card */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Course Resources</h3>
                <p className="text-sm text-muted-foreground">Download materials to enhance your learning</p>
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/courses/bolt-new/resources/manual', {
                    credentials: 'include',
                  });

                  if (response.status === 403) {
                    alert('Subscription required to access course resources. Please subscribe to continue.');
                    setLocation('/courses');
                    return;
                  }

                  if (!response.ok) {
                    throw new Error('Failed to get resource');
                  }

                  const data = await response.json();
                  window.open(data.url, '_blank');
                } catch (error) {
                  console.error('Error accessing resource:', error);
                  alert('Failed to access resource. Please try again.');
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
            >
              <div className="p-3 rounded-lg bg-muted/50 group-hover:bg-violet-500/10">
                <FileDown className="h-5 w-5 text-muted-foreground group-hover:text-violet-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Reference Manual</div>
                <div className="text-sm text-muted-foreground">PDF guide for bolt.new</div>
              </div>
              {!videoUrls.hasAccess && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <Lock className="h-3 w-3 mr-1" />
                  Subscribers Only
                </Badge>
              )}
            </button>
          </motion.div>

          {/* Assignment Submission */}
          <motion.div variants={itemVariants} className="card-noir p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Submit Assignment</h3>
                <p className="text-sm text-muted-foreground">Complete the course assignment and submit your work</p>
              </div>
            </div>

            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-emerald-400">Assignment submitted successfully!</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="url"
                  name="assignmentLink"
                  placeholder="https://github.com/username/repo or deployed URL"
                  required
                  disabled={submitting}
                  className="bg-muted/30 border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Submit a link to your GitHub repository or deployed application
                </p>
              </div>
              <Button type="submit" disabled={submitting} className="w-full btn-primary">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Assignment
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default BoltNewCoursePage;
