import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles, Brain, ListChecks } from 'lucide-react';

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

const FileDropzone = ({ onClick, onDrop, isProcessing }: { onClick: () => void; onDrop: (file: File) => void; isProcessing: boolean }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onDrop(e.dataTransfer.files[0]);
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`card-noir p-12 text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
        isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-border/50 hover:border-cyan-500/50 hover:bg-muted/30'
      } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 rounded-2xl bg-cyan-500/10 inline-flex mb-6">
        <Upload className={`h-10 w-10 text-cyan-400 ${isDragging ? 'animate-bounce' : ''}`} />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {isDragging ? 'Drop your file here' : 'Upload Document'}
      </h3>
      <p className="text-muted-foreground">
        Drag & drop a PRD or technical spec, or click to browse
      </p>
      <p className="text-xs text-muted-foreground mt-4">
        Supports PDF, DOC, DOCX, TXT, and MD files
      </p>
    </motion.div>
  );
};

const PlanDisplay = ({ plan }: { plan: any }) => {
  if (!plan) return null;

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted/50 text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Project Overview */}
      <div className="card-noir p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
            <Brain className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold gradient-text-purple">{plan.projectName}</h2>
        </div>
        <p className="text-muted-foreground">{plan.summary}</p>
      </div>

      {/* Tasks */}
      <div className="card-noir p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <ListChecks className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-semibold">Generated Tasks</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 ml-auto">
            {plan.tasks.length} tasks
          </Badge>
        </div>
        <div className="space-y-4">
          {plan.tasks.map((task: any) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: task.id * 0.1 }}
              className="p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-sm font-bold">
                    {task.id}
                  </span>
                  <h4 className="font-semibold">{task.title}</h4>
                </div>
                <Badge className={getComplexityColor(task.estimatedComplexity)}>
                  {task.estimatedComplexity}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground ml-11">{task.description}</p>
              {task.dependencies.length > 0 && (
                <div className="mt-3 ml-11 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Depends on:</span>
                  {task.dependencies.map((dep: number) => (
                    <Badge key={dep} variant="outline" className="text-xs">
                      Task {dep}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const StatusIndicator = ({ status }: { status: string }) => {
  if (!status) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-3 py-8"
    >
      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      <span className="text-lg font-medium text-cyan-400">{status}...</span>
    </motion.div>
  );
};

const AiScopingAgentPage = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!user) {
      setError("You must be logged in to use the AI Scoping Agent.");
      return;
    }
    setPlan(null);
    setError(null);
    setStatus('Uploading document');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const csrfResponse = await fetch('/api/auth/csrf-token');
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/ai-scoping/upload', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed.');
      }

      const data = await response.json();
      setJobId(data.jobId);
      setStatus('Processing document');
      pollForResults(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStatus('');
    }
  };

  const pollForResults = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai-scoping/results/${id}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setPlan(data.result);
          setStatus('');
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setError('Failed to process the document.');
          setStatus('');
          clearInterval(interval);
        }
      } catch (err) {
        setError('Failed to fetch results.');
        setStatus('');
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileUpload(event.target.files[0]);
    }
  };

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
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-400">AI-Powered</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="gradient-text-cyan">Project Scoping Agent</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload a PRD or technical spec to automatically generate a detailed project plan with tasks and estimates.
            </p>
          </motion.div>

          {/* Dropzone */}
          {!plan && (
            <>
              <FileDropzone onClick={handleAreaClick} onDrop={handleFileUpload} isProcessing={!!status} />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelected}
                accept=".pdf,.doc,.docx,.txt,.md"
                className="hidden"
              />
            </>
          )}

          {/* Status */}
          {status && <StatusIndicator status={status} />}

          {/* Error */}
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

          {/* Plan Display */}
          <PlanDisplay plan={plan} />

          {/* Reset Button */}
          {plan && (
            <motion.div variants={itemVariants} className="flex justify-center">
              <Button
                variant="outline"
                className="border-border/50 hover:border-cyan-500/50"
                onClick={() => {
                  setPlan(null);
                  setError(null);
                  setJobId(null);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload Another Document
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AiScopingAgentPage;
