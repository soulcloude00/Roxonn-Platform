// API base URL - hardcoded to API URL to fix CORS issues
export const STAGING_API_URL = 'https://api.roxonn.com';

// App configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Roxonn';
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3000';

// Blockchain related addresses needed on the client
export const ROXN_TOKEN_ADDRESS = import.meta.env.VITE_ROXN_TOKEN_ADDRESS || '0xD0b99c496e7Bd6EFE62Fc4cBfB2A796B62e59c2c'; // Default from server config, ensure your .env for client has this
export const UNIFIED_REWARDS_CONTRACT_ADDRESS = import.meta.env.VITE_UNIFIED_REWARDS_CONTRACT_ADDRESS || '0xdbB179e9F715FCAd710d6dE538748d0226Bbc4E3'; // This is the main RepoRewardsProxy address
export const PROOF_OF_COMPUTE_CONTRACT_ADDRESS = import.meta.env.VITE_PROOF_OF_COMPUTE_CONTRACT_ADDRESS || '0xB583603b308e59de460330263F5cfF3e41714449';
export const XDC_RPC_URL = import.meta.env.VITE_XDC_RPC_URL || 'https://rpc.xinfin.network';

// Feature flags
export const ENABLE_DEBUG = import.meta.env.VITE_ENABLE_DEBUG === 'true';

// Debug logging function
export const debug = (...args: any[]) => {
  if (ENABLE_DEBUG) {
    
  }
};

// Other configuration variables can be added here
