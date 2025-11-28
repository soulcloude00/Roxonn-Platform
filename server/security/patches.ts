// Security patches for payload validation bypass vulnerability
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';

// Schema for repository data validation
const repoSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  githubId: z.string().regex(/^\d+$/),
  fullName: z.string().min(1).max(200),
  // Add other fields as needed
});

// Middleware to validate repository payloads
export const validateRepoPayload = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate content length
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return res.status(413).json({ 
        error: 'Payload too large',
        message: 'Request entity too large. Maximum size is 1MB.'
      });
    }

    // Validate content type
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/json')) {
      return res.status(415).json({ 
        error: 'Unsupported media type',
        message: 'Only application/json content type is supported.'
      });
    }

    // Validate payload structure
    if (req.body) {
      repoSchema.parse(req.body);
    }

    next();
  } catch (error) {
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sanitize incoming payloads
export const sanitizeRepoPayload = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body) {
      // Recursively sanitize all string fields
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          // Remove dangerous characters and limit length
          return sanitizeHtml(obj, {
            allowedTags: [],
            allowedAttributes: {}
          }).substring(0, 10000); // Limit string length
        } else if (Array.isArray(obj)) {
          return obj.map(item => sanitizeObject(item));
        } else if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              sanitized[key] = sanitizeObject(obj[key]);
            }
          }
          return sanitized;
        }
        return obj;
      };

      req.body = sanitizeObject(req.body);
    }
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Sanitization failed',
      message: 'Failed to process request payload'
    });
  }
};

// Security monitoring middleware
export const securityMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request details
  console.log(`SECURITY: ${req.method} ${req.path} from ${req.ip}`, {
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type'),
    timestamp: new Date().toISOString()
  });

  // Monitor response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Log slow requests
      console.warn(`SECURITY ALERT: Slow request (${duration}ms)`, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Log large payloads
    const contentLength = res.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 1024 * 500) { // 500KB
      console.warn(`SECURITY ALERT: Large response (${contentLength} bytes)`, {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
    }
  });

  next();
};