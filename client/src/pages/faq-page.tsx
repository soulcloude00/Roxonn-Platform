import React from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, MessageCircle, HelpCircle, Shield, Zap, Users, Code, Wallet, GitBranch, Lightbulb } from "lucide-react";

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

// Category Icon mapping
const categoryIcons: Record<string, React.ReactNode> = {
  "General Platform Questions": <HelpCircle className="h-5 w-5" />,
  "Blockchain & Tokens": <Zap className="h-5 w-5" />,
  "Account & Wallet": <Wallet className="h-5 w-5" />,
  "Repository Management": <GitBranch className="h-5 w-5" />,
  "Issue Rewards": <Users className="h-5 w-5" />,
  "Technical Questions": <Code className="h-5 w-5" />,
  "Troubleshooting": <AlertCircle className="h-5 w-5" />,
  "Pool Manager Guide": <Shield className="h-5 w-5" />,
  "Future Plans": <Lightbulb className="h-5 w-5" />,
};

export default function FAQPage() {
  React.useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        element.classList.add('highlight-section');
        setTimeout(() => {
          element.classList.remove('highlight-section');
        }, 2000);
      }
    }
  }, []);

  const faqCategories = [
    {
      title: "General Platform Questions",
      items: [
        {
          question: "What is ROXONN?",
          answer:
            "ROXONN is a decentralized platform that integrates GitHub repositories with the XDC blockchain, allowing repository owners to reward contributors with tokens for their work on issues and pull requests.",
        },
        {
          question: "Why does the platform show \"Beta\" in the navigation bar?",
          answer:
            "The platform is currently in beta testing phase, which means we're still refining features and functionality based on user feedback before a full production release.",
        },
        {
          question: "Is this platform free to use?",
          answer:
            "The platform itself is free to use. However, blockchain transactions may require small gas fees on the XDC network.",
        },
      ],
    },
    {
      title: "Blockchain & Tokens",
      items: [
        {
          question: "What blockchain does the platform use?",
          answer:
            "The platform operates on the XDC Mainnet, which is the production environment for the XDC blockchain.",
        },
        {
          question: "Are the tokens on the platform real?",
          answer:
            "Yes, all tokens on the platform represent real value as we're operating on the XDC Mainnet.",
        },
        {
          question: "How do I get XDC tokens?",
          answer:
            "You can obtain XDC tokens from various cryptocurrency exchanges that support the XDC Network.",
        },
        {
          question: "When will the ROXONN token launch take place?",
          answer:
            "The date for the official ROXONN token launch will be announced on our platform and social media channels. After launch, tokens earned on the platform will have real value.",
        },
      ],
    },
    {
      title: "Account & Wallet",
      items: [
        {
          question: "How do I create an account?",
          answer:
            "You can sign up using your GitHub account, which will authenticate you and create a linked XDC wallet on our platform.",
        },
        {
          question: "Is my GitHub data secure on the platform?",
          answer:
            "Yes, we only access the GitHub data necessary for platform functionality and comply with GitHub's security policies and OAuth scopes.",
        },
        {
          question: "How is my wallet created and managed?",
          answer:
            "A XDC wallet is automatically generated for you during the registration process. The wallet is secured and managed through our platform's integration with the blockchain.",
        },
        {
          question: "Can I connect my existing XDC wallet instead of creating a new one?",
          answer:
            "Currently, the platform generates a new wallet for each user, but we're working on functionality to allow connecting existing wallets in future updates.",
        },
      ],
    },
    {
      title: "Repository Management",
      items: [
        {
          question: "How do I add my GitHub repository to the platform?",
          answer:
            "After signing in, you can navigate to the Repositories page and add your GitHub repositories to the platform with a few clicks.",
        },
        {
          question: "Who can manage rewards for a repository?",
          answer:
            "Repository owners and designated pool managers can add funds to the repository reward pool and allocate rewards to specific issues.",
        },
        {
          question: "How do I add funds to my repository's reward pool?",
          answer:
            "On your repository's details page, you can add XDC tokens to the reward pool by entering the amount and confirming the transaction.",
        },
      ],
    },
    {
      title: "Issue Rewards",
      items: [
        {
          question: "How do I set rewards for specific issues?",
          answer:
            "Repository managers can allocate tokens from the repository's reward pool to specific issues by entering the issue number and the reward amount.",
        },
        {
          question: "How are rewards distributed to contributors?",
          answer:
            "When a contributor's pull request for an issue is accepted and merged, the system automatically triggers the reward distribution to their wallet.",
        },
        {
          question: "Can I modify a reward after it's been set?",
          answer:
            "Yes, as a repository manager, you can modify rewards for issues as long as they haven't been claimed yet.",
        },
      ],
    },
    {
      title: "Technical Questions",
      items: [
        {
          question: "What happens if the blockchain transaction fails during reward distribution?",
          answer:
            "The system will retry failed transactions. If issues persist, you can contact support for manual intervention.",
        },
        {
          question: "Is my code contribution evaluated before rewards are distributed?",
          answer:
            "The platform relies on the repository owner's decision to merge a pull request as verification of valuable contribution. The reward is distributed when the PR is merged.",
        },
        {
          question: "How does the platform verify GitHub contributions?",
          answer:
            "The platform integrates with GitHub's API to verify issue creation, pull request submissions, and merge events for accurate reward distribution.",
        },
      ],
    },
    {
      title: "Troubleshooting",
      items: [
        {
          question: "Why is my reward not showing in my wallet?",
          answer:
            "Blockchain transactions may take some time to process. If a reward hasn't appeared after 15 minutes, check the transaction status in your profile and contact support if needed.",
        },
        {
          question: "What should I do if I encounter errors while using the platform?",
          answer:
            "Most errors can be resolved by refreshing the page or signing out and back in. For persistent issues, please reach out to our support team.",
        },
        {
          question: "How can I report a bug or request a feature?",
          answer:
            "You can submit bug reports or feature requests through the platform's Help & Guides section or by contacting our support team directly.",
        },
      ],
    },
    {
      title: "Pool Manager Guide",
      id: "pool-manager",
      items: [
        {
          question: "What is a Pool Manager?",
          answer:
            "A Pool Manager is a GitHub repository owner or administrator who can add funds to their repository's reward pool and allocate those funds to specific issues. Pool Managers are responsible for incentivizing contributors and distributing rewards for completed work.",
        },
        {
          question: "How do I become a Pool Manager?",
          answer:
            "When signing up for ROXONN, select 'Pool Manager' as your role. You'll need to have admin permissions on the GitHub repositories you want to manage rewards for.",
        },
        {
          question: "Which repositories can I manage?",
          answer:
            "You can only manage repositories where you have administrator permissions on GitHub. When funding a repository, the system verifies your admin status through the GitHub API before allowing the transaction.",
        },
        {
          question: "How do I fund a repository?",
          answer:
            "Navigate to your profile page to see your GitHub repositories, or visit the repository details page and click on the 'Rewards' tab. Enter the amount of ROXN tokens you want to add to the repository pool and confirm the transaction. A small platform fee (0.5%) will be deducted from the funding amount.",
        },
        {
          question: "How do I allocate rewards to issues?",
          answer:
            "On the repository details page, find the issue you want to incentivize and click 'Set Reward'. Enter the reward amount and confirm. Contributors will see this reward and can work on the issue to earn it.",
        },
        {
          question: "Can I add funds to repositories I don't own?",
          answer:
            "No. For security reasons, you can only fund repositories where you have administrator permissions on GitHub. This prevents unauthorized funding activities.",
        },
        {
          question: "What fees are charged when funding a repository?",
          answer:
            "When funding a repository, a 0.5% platform fee is deducted from the total amount. When contributors receive payouts, an additional 0.5% fee is deducted (total effective fee: 1%). These fees support ongoing development and maintenance of the ROXONN platform.",
        },
        {
          question: "How do contributors claim their rewards?",
          answer:
            "Once a contributor completes an issue, they can submit a pull request. After the PR is approved and merged, you (as the Pool Manager) can distribute the reward to the contributor through the platform.",
        },
      ],
    },
    {
      title: "Future Plans",
      items: [
        {
          question: "Will the platform support other blockchains beyond XDC?",
          answer:
            "Future updates may include support for additional blockchain networks, which will be announced as they become available.",
        },
        {
          question: "Are there plans to add more GitHub integration features?",
          answer:
            "Yes, we are continuously working on enhancing GitHub integration with features like automatic issue detection, contribution metrics, and more comprehensive reward management tools.",
        },
      ],
    },
  ];

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
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <HelpCircle className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-400">Help Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="gradient-text-cyan">FAQ</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about the ROXONN platform, blockchain integration, and rewards system.
            </p>
          </motion.div>

          {/* Mainnet Banner */}
          <motion.div
            variants={itemVariants}
            className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <Shield className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-400">Live on XDC Mainnet</p>
              <p className="text-sm text-muted-foreground mt-1">
                This platform is running on the XDC Mainnet. All token rewards represent real value.
              </p>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* FAQ Categories */}
            <div className="lg:col-span-2 space-y-6">
              {faqCategories.map((category, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="card-noir overflow-hidden"
                  id={category.id}
                >
                  <div className="p-4 border-b border-border/50 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        {categoryIcons[category.title] || <HelpCircle className="h-5 w-5" />}
                      </div>
                      <h3 className="font-semibold">{category.title}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <Accordion type="single" collapsible className="w-full">
                      {category.items.map((item, j) => (
                        <AccordionItem key={j} value={`item-${i}-${j}`} className="border-border/50">
                          <AccordionTrigger className="text-left font-medium hover:no-underline hover:text-cyan-400 transition-colors">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Beta Badge Card */}
              <motion.div variants={itemVariants} className="card-noir p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Beta Platform</h3>
                </div>
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 mb-4">
                  Beta
                </Badge>
                <p className="text-sm text-muted-foreground">
                  We're constantly improving the platform based on user feedback. Your experience helps us make ROXONN better!
                </p>
              </motion.div>

              {/* Support Card */}
              <motion.div variants={itemVariants} className="card-noir p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Need More Help?</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  If you couldn't find the answer to your question, chat with our support team or email us at{' '}
                  <span className="text-cyan-400 font-medium">connect@roxonn.com</span>
                </p>
                <Button
                  variant="outline"
                  className="w-full border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                  onClick={() => {
                    if (window.$zoho && window.$zoho.salesiq && window.$zoho.salesiq.floatwindow) {
                      window.$zoho.salesiq.floatwindow.visible('show');
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat with Support
                </Button>
              </motion.div>

              {/* Quick Links */}
              <motion.div variants={itemVariants} className="card-noir p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">Quick Links</h3>
                </div>
                <div className="space-y-2">
                  <a href="#pool-manager" className="block text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                    Pool Manager Guide
                  </a>
                  <a href="/repos" className="block text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                    Browse Repositories
                  </a>
                  <a href="/wallet" className="block text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                    Wallet Management
                  </a>
                  <a href="/dashboard" className="block text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                    Your Dashboard
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
