import { fileURLToPath } from "url";
import path, { dirname } from "path";
import express, { type Express } from "express";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Patterns for sensitive data that should be redacted in logs
 */
const SENSITIVE_PATTERNS = [
  // Private keys (64 hex chars, with or without 0x prefix)
  {
    pattern: /\b(0x)?[0-9a-f]{64}\b/gi,
    replacement: '[PRIVATE_KEY_REDACTED]'
  },
  // Wallet addresses (40 hex chars after 0x, or 42 chars starting with xdc)
  {
    pattern: /\b0x[0-9a-f]{40}\b/gi,
    replacement: (match: string) => `${match.substring(0, 6)}...${match.substring(match.length - 4)}`
  },
  {
    pattern: /\bxdc[0-9a-f]{40}\b/gi,
    replacement: (match: string) => `${match.substring(0, 6)}...${match.substring(match.length - 4)}`
  },
  // Mnemonics (12-24 words)
  {
    pattern: /\b(?:[a-z]+\s+){11,23}[a-z]+\b/gi,
    replacement: '[MNEMONIC_REDACTED]'
  },
  // API keys and tokens (common patterns)
  {
    pattern: /\b[A-Za-z0-9]{20,}\b/g,
    replacement: (match: string) => {
      if (match.length >= 20 && /^[A-Za-z0-9]+$/.test(match)) {
        return `${match.substring(0, 4)}...[${match.length - 8} chars]...${match.substring(match.length - 4)}`;
      }
      return match;
    }
  },
  // GitHub tokens
  {
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36}\b/gi,
    replacement: '[GITHUB_TOKEN_REDACTED]'
  },
  // Session IDs and JWTs
  {
    pattern: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,
    replacement: (match: string) => {
      if (match.length >= 40) {
        return `${match.substring(0, 8)}...[TOKEN_REDACTED]`;
      }
      return match;
    }
  }
];

/**
 * Redact sensitive information from log messages
 * @param message The log message to sanitize
 * @returns Sanitized message with sensitive data redacted
 */
function redactSensitiveData(message: string): string {
  let sanitized = message;
  
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    if (typeof replacement === 'function') {
      sanitized = sanitized.replace(pattern, replacement);
    } else {
      sanitized = sanitized.replace(pattern, replacement);
    }
  }
  
  return sanitized;
}

/**
 * Enhanced logging function with sensitive data redaction
 * @param message The message to log
 * @param source The source/module name
 * @param level Log level (info, warn, error, security)
 */
export function log(message: string, source = "express", level: 'info' | 'warn' | 'error' | 'security' = 'info') {
  // Simple filtering for noisy logs
  if (source === 'cors-debug' || source === 'cookies' || source === 'express') {
    // Skip these noisy logs
    return;
  }
  
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Redact sensitive data from the message
  const sanitizedMessage = redactSensitiveData(message);
  
  // Add level indicator
  const levelPrefix = level === 'info' ? '' : `[${level.toUpperCase()}] `;
  
  // Log with timestamp, level, source, and sanitized message
  console.log(`[${formattedTime}] ${levelPrefix}[${source}] ${sanitizedMessage}`);
  
  // For security events, also log to a separate security log if needed
  if (level === 'security') {
    // In production, you might want to send security logs to a SIEM or security monitoring system
    console.log(`[SECURITY] [${formattedTime}] [${source}] ${sanitizedMessage}`);
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}