// Security configuration for the application
import { config } from '../config';

// Security settings
export const securityConfig = {
  // Rate limiting settings
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequestsPerWindow: 100, // Max requests per IP per window
    message: {
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  
  // Payload validation settings
  payloadValidation: {
    maxSize: 1024 * 1024, // 1MB max payload size
    allowedContentTypes: ['application/json'],
    maxStringLength: 10000, // Max length for string fields
    allowedCharacters: /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=\[\]{}|;:'",.<>?/~`]*$/, // Regex for allowed characters
  },
  
  // Database protection settings
  databaseProtection: {
    queryTimeoutMs: 5000, // 5 second timeout for database queries
    maxQueryRetries: 3, // Max retries for failed queries
    connectionPoolSize: 10, // Max concurrent database connections
  },
  
  // Input sanitization settings
  inputSanitization: {
    stripTags: true, // Remove HTML tags
    encodeEntities: true, // Encode HTML entities
    removeComments: true, // Remove HTML comments
    allowedTags: [], // No HTML tags allowed by default
    allowedAttributes: {}, // No HTML attributes allowed by default
  },
  
  // Security monitoring settings
  monitoring: {
    logSlowRequests: true, // Log requests taking longer than threshold
    slowRequestThresholdMs: 5000, // Threshold for slow requests (5 seconds)
    logLargeResponses: true, // Log responses larger than threshold
    largeResponseThresholdBytes: 1024 * 500, // Threshold for large responses (500KB)
    logSuspiciousActivities: true, // Log suspicious activities
  },
  
  // Authentication security settings
  authentication: {
    sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    maxFailedLoginAttempts: 5, // Max failed login attempts before lockout
    lockoutDurationMs: 30 * 60 * 1000, // 30 minutes lockout duration
    requireStrongPasswords: true, // Require strong passwords
    passwordMinLength: 8, // Minimum password length
    passwordRequireNumbers: true, // Require numbers in passwords
    passwordRequireSpecialChars: true, // Require special characters in passwords
  },
  
  // API security settings
  apiSecurity: {
    corsOrigins: [
      config.frontendUrl,
      'https://app.roxonn.com',
      'https://api.roxonn.com',
      'http://localhost:3000',
      'http://localhost:5000'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token'
    ],
    exposeHeaders: ['X-CSRF-Token'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }
};

// Security middleware configuration
export const securityMiddleware = {
  // Helmet configuration for HTTP headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com", "https://images.unsplash.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", config.apiUrl, config.frontendUrl, "https://api.github.com"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  },
  
  // CORS configuration
  cors: {
    origin: securityConfig.apiSecurity.corsOrigins,
    methods: securityConfig.apiSecurity.allowedMethods,
    allowedHeaders: securityConfig.apiSecurity.allowedHeaders,
    exposedHeaders: securityConfig.apiSecurity.exposeHeaders,
    credentials: securityConfig.apiSecurity.credentials,
    maxAge: securityConfig.apiSecurity.maxAge,
    preflightContinue: false,
    optionsSuccessStatus: 204
  }
};

// Export utility functions for security checks
export const securityUtils = {
  // Validate payload size
  validatePayloadSize: (contentLength: string | undefined): boolean => {
    if (!contentLength) return true;
    return parseInt(contentLength) <= securityConfig.payloadValidation.maxSize;
  },
  
  // Validate content type
  validateContentType: (contentType: string | undefined): boolean => {
    if (!contentType) return false;
    return securityConfig.payloadValidation.allowedContentTypes.some(type => 
      contentType.includes(type)
    );
  },
  
  // Sanitize input string
  sanitizeInput: (input: string): string => {
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    // Limit string length
    sanitized = sanitized.substring(0, securityConfig.payloadValidation.maxStringLength);
    
    return sanitized;
  },
  
  // Validate string content
  validateStringContent: (input: string): boolean => {
    return securityConfig.payloadValidation.allowedCharacters.test(input);
  },
  
  // Generate secure random string
  generateSecureRandomString: (length: number = 32): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
};

export default securityConfig;