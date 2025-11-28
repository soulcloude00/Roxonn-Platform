import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { Server, Send, Bot, User, AlertCircle, Loader2, Network, Zap } from 'lucide-react';
import { Redirect } from 'wouter';

interface ExoNode {
  id: string;
  walletAddress: string;
  status: 'online' | 'offline';
  lastSeen: string;
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

const messageVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

const DecentralizedChatPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<{ author: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ExoNode[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNodeStatuses = async () => {
      try {
        const response = await fetch('/api/nodes/status');
        if (!response.ok) {
          throw new Error('Failed to fetch node statuses.');
        }
        const data = await response.json();
        setNodes(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNodeStatuses();
    const interval = setInterval(fetchNodeStatuses, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { author: 'user' as const, text: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/node/dispatch-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from the network.');
      }

      const data = await response.json();
      setMessages([...newMessages, { author: 'ai' as const, text: data.message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
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

  const onlineNodes = nodes.filter(node => node.status === 'online').length;

  return (
    <div className="min-h-screen bg-background noise-bg flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10 flex flex-col flex-1 w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col flex-1 space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
              <Network className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-violet-400">Decentralized Network</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="gradient-text-purple">AI Chat</span>
            </h1>
          </motion.div>

          {/* Network Status */}
          <motion.div variants={itemVariants} className="card-noir p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Network Status</h3>
                  <p className="text-xs text-muted-foreground">Distributed compute nodes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-sm">
                  <span className="text-emerald-400">{onlineNodes}</span>
                  <span className="text-muted-foreground"> / {nodes.length} online</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {nodes.map(node => (
                  <Tooltip key={node.id}>
                    <TooltipTrigger>
                      <div className={`p-2 rounded-lg border transition-colors ${
                        node.status === 'online'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        <Server className={`h-4 w-4 ${
                          node.status === 'online' ? 'text-emerald-400' : 'text-red-400'
                        }`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="card-noir border-border/50">
                      <p className="font-mono text-xs">ID: {node.id}</p>
                      <p className="text-xs">Status: <span className={node.status === 'online' ? 'text-emerald-400' : 'text-red-400'}>{node.status}</span></p>
                      <p className="text-xs text-muted-foreground">Last: {new Date(node.lastSeen).toLocaleString()}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
              {nodes.length === 0 && (
                <p className="text-sm text-muted-foreground">No nodes connected</p>
              )}
            </div>
          </motion.div>

          {/* Chat Container */}
          <motion.div variants={itemVariants} className="card-noir flex-1 flex flex-col overflow-hidden min-h-[400px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 rounded-2xl bg-violet-500/10 inline-flex mb-4">
                    <Bot className="h-10 w-10 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                  <p className="text-muted-foreground text-sm">
                    Your messages will be processed by decentralized compute nodes.
                  </p>
                </div>
              )}
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  className={`flex ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-[80%] ${msg.author === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      msg.author === 'user'
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'bg-violet-500/10 text-violet-400'
                    }`}>
                      {msg.author === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl ${
                      msg.author === 'user'
                        ? 'bg-cyan-500/10 border border-cyan-500/20'
                        : 'bg-violet-500/10 border border-violet-500/20'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/50">
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-muted/30 border-border/50 focus:border-violet-500/50"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className="btn-primary"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                <Zap className="h-3 w-3 inline-block mr-1" />
                Powered by decentralized compute nodes
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default DecentralizedChatPage;
