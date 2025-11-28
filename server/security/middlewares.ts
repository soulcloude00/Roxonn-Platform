// Security middleware for protecting against payload validation bypass
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { securityConfig, securityUtils } from './config';
import { log } from '../utils';

// Schema for validating repository data
const repoSchema = z.object({
  githubRepoId: z.union([z.string(), z.number()]).transform(val => String(val)),
  githubRepoFullName: z.string().min(1).max(200),
  installationId: z.string().optional(),
  _csrf: z.string().optional(),
});

// Middleware to validate repository payloads
export const validateRepoPayload = (req: Request, res: Response, next: NextFunction) => {
  try {
    log(`Validating repository payload for ${req.method} ${req.path}`, 'security');
    
    // Validate content length
    const contentLength = req.get('Content-Length');
    if (contentLength && !securityUtils.validatePayloadSize(contentLength)) {
      log(`Payload too large: ${contentLength} bytes`, 'security');
      return res.status(413).json({ 
        error: 'Payload too large',
        message: `Request entity too large. Maximum size is ${securityConfig.payloadValidation.maxSize} bytes.`
      });
    }

    // Validate content type
    const contentType = req.get('Content-Type');
    if (contentType && !securityUtils.validateContentType(contentType)) {
      log(`Unsupported content type: ${contentType}`, 'security');
      return res.status(415).json({ 
        error: 'Unsupported media type',
        message: `Only ${securityConfig.payloadValidation.allowedContentTypes.join(', ')} content types are supported.`
      });
    }

    // Validate payload structure if body exists
    if (req.body && Object.keys(req.body).length > 0) {
      // Check for excessively deep nesting
      const checkDepth = (obj: any, depth = 0): boolean => {
        if (depth > 10) return false; // Max nesting depth of 10
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          return Object.values(obj).every(val => checkDepth(val, depth + 1));
        }
        return true;
      };
      
      if (!checkDepth(req.body)) {
        log('Payload has excessive nesting depth', 'security');
        return res.status(413).json({
          error: 'Payload too complex',
          message: 'Request payload has excessive nesting depth.'
        });
      }
      
      // Validate with Zod schema
      repoSchema.parse(req.body);
      log('Payload validation passed', 'security');
    }

    next();
  } catch (error: any) {
    log(`Payload validation failed: ${error.message}`, 'security');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request payload',
        details: error.errors
      });
    }
    
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Malformed request payload'
    });
  }
};

// Rate limiter for repository operations
export const repoRateLimiter = rateLimit({
  windowMs: securityConfig.rateLimiting.windowMs,
  max: securityConfig.rateLimiting.maxRequestsPerWindow,
  message: securityConfig.rateLimiting.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP address as key, but also consider user agent for better accuracy
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  },
  skip: (req: Request, res: Response) => {
    // Skip rate limiting for health check endpoints
    return req.path.includes('/health') || req.path.includes('/ping');
  }
});

// Middleware to sanitize incoming payloads
export const sanitizeRepoPayload = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body && Object.keys(req.body).length > 0) {
      log(`Sanitizing payload for ${req.method} ${req.path}`, 'security');
      
      // Recursively sanitize all string fields
      const sanitizeObject = (obj: any, depth: number = 0): any => {
        // Prevent excessive nesting attacks
        if (depth > 10) {
          log(`Excessive nesting detected (depth ${depth})`, 'security', 'error');
          throw new Error('Payload nesting too deep');
        }
        
        if (typeof obj === 'string') {
          // First check string length before processing
          if (obj.length > securityConfig.payloadValidation.maxStringLength) {
            log(`String too long: ${obj.length} chars`, 'security', 'error');
            throw new Error('String field too long');
          }
          
          // Sanitize and validate string content
          const sanitized = securityUtils.sanitizeInput(obj);
          
          // Validate character content - reject if too many invalid chars
          const invalidChars = sanitized.match(/[^a-zA-Z0-9\s\-_.,!?@#$%^&*()+=\[\]{}|;:'",.<>?/~`]/g);
          if (invalidChars && invalidChars.length > sanitized.length * 0.2) {
            log(`Too many invalid characters detected: ${invalidChars.length} in ${sanitized.length} chars`, 'security', 'error');
            throw new Error('String contains too many invalid characters');
          }
          
          // Remove any remaining invalid characters
            return sanitized.replace(/[^a-zA-Z0-9\s\-_.,!?@#$%^&*()+=\[\]{}|;:'",.<>?/~`]/g, '');
        } else if (Array.isArray(obj)) {
          // Limit array size
          if (obj.length > 1000) {
            log(`Array too large: ${obj.length} items`, 'security', 'error');
            throw new Error('Array too large');
          }
          return obj.map(item => sanitizeObject(item, depth + 1));
        } else if (obj && typeof obj === 'object') {
          // Limit object keys
          const keys = Object.keys(obj);
          if (keys.length > 100) {
            log(`Object has too many keys: ${keys.length}`, 'security', 'error');
            throw new Error('Object has too many keys');
          }
          
          const sanitized: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              // Sanitize key names as well
              const sanitizedKey = securityUtils.sanitizeInput(key).replace(/[^a-zA-Z0-9_]/g, '');
              if (sanitizedKey.length === 0) {
                log(`Invalid key name: ${key}`, 'security', 'warn');
                continue; // Skip invalid keys
              }
              sanitized[sanitizedKey] = sanitizeObject(obj[key], depth + 1);
            }
          }
          return sanitized;
        }
        return obj;
      };

      req.body = sanitizeObject(req.body);
      log('Payload sanitization completed', 'security');
    }
    next();
  } catch (error: any) {
    log(`Payload sanitization failed: ${error.message}`, 'security', 'error');
    return res.status(400).json({
      error: 'Sanitization failed',
      message: error.message || 'Failed to process request payload'
    });
  }
};

// Security monitoring middleware
export const securityMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request details
  log(`SECURITY: ${req.method} ${req.path} from ${req.ip}`, 'security', 'security');
  log(`Request details: User-Agent=${req.get('User-Agent')}, Content-Length=${req.get('Content-Length')}, Content-Type=${req.get('Content-Type')}`, 'security');
  
  // Monitor for suspicious patterns
  const userAgent = req.get('User-Agent') || '';
  const contentLength = req.get('Content-Length') || '0';
  
  // Check for suspicious user agents
  if (userAgent.includes('bot') || userAgent.includes('crawler')) {
    log(`Suspicious user agent detected: ${userAgent}`, 'security', 'warn');
  }
  
  // Check for unusually large payloads
  if (parseInt(contentLength) > securityConfig.payloadValidation.maxSize * 0.8) {
    log(`Large payload detected: ${contentLength} bytes`, 'security', 'warn');
  }
  
  // Monitor response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > securityConfig.monitoring.slowRequestThresholdMs) {
      log(`SECURITY ALERT: Slow request (${duration}ms) ${req.method} ${req.path} from ${req.ip}`, 'security', 'warn');
    }
    
    // Log large responses
    const responseLength = res.get('Content-Length');
    if (responseLength && parseInt(responseLength) > securityConfig.monitoring.largeResponseThresholdBytes) {
      log(`SECURITY ALERT: Large response (${responseLength} bytes) ${req.method} ${req.path} to ${req.ip}`, 'security', 'warn');
    }
  });

  next();
};

// Middleware to prevent database interface overload
export const preventDbOverload = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for potentially dangerous patterns in request
    const requestBody = JSON.stringify(req.body || {});
    
    // Enhanced validation: Check payload size before pattern matching
    if (requestBody.length > securityConfig.payloadValidation.maxSize) {
      log(`Oversized payload detected: ${requestBody.length} bytes`, 'security', 'error');
      return res.status(413).json({
        error: 'Payload too large',
        message: 'Request payload exceeds maximum allowed size.'
      });
    }
    
    // Look for patterns that might cause database issues
    const dangerousPatterns = [
      /['";\\\*]|--/gi, // SQL injection patterns (excluding single hyphens which are valid in repo names)
      /\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s+(ALL|FROM|INTO|TABLE|DATABASE)\b/gi, // SQL keywords with context
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER).*\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi // Combined patterns
    ];
    
    // Check for excessive special characters (potential payload validation bypass)
    const specialCharCount = (requestBody.match(/[^a-zA-Z0-9\s\-_.,!?@]/g) || []).length;
    const specialCharRatio = specialCharCount / requestBody.length;
    
    if (specialCharRatio > 0.3) { // More than 30% special characters
      log(`Excessive special characters detected: ${specialCharRatio * 100}% of payload`, 'security', 'error');
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'Request contains excessive non-standard characters.'
      });
    }
    
    // Check for malicious patterns
    let hasDangerousPattern = false;
    for (const pattern of dangerousPatterns) {
      if (pattern.test(requestBody)) {
        log(`Potentially dangerous pattern detected: ${requestBody.substring(0, 100)}...`, 'security', 'warn');
        hasDangerousPattern = true;
        break;
      }
    }
    
    if (hasDangerousPattern) {
      // Reject requests with SQL injection patterns
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'Request contains potentially malicious patterns.'
      });
    }
    
    next();
  } catch (error: any) {
    log(`Database overload prevention check failed: ${error.message}`, 'security');
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Failed to validate request payload.'
    });
  }
};

// Export all security middlewares as a single object
export const securityMiddlewares = {
  validateRepoPayload,
  repoRateLimiter,
  sanitizeRepoPayload,
  securityMonitor,
  preventDbOverload
};

export default securityMiddlewares;