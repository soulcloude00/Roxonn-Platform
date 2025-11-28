import { createContext, useContext, useEffect, useState, useRef } from "react";
import api from "../lib/api";
import csrfService from "../lib/csrf";

interface User {
  id: number;
  githubId: string;
  username: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  githubUsername: string;
  githubAccessToken: string;
  isProfileComplete: boolean;
  xdcWalletAddress: string | null;
  walletReferenceId: string | null;
  role: "contributor" | "poolmanager" | null;
  promptBalance: number; // Changed from aiCredits, assuming it's always a number (default 0)
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await api.get<User>('/api/auth/user');
      setUser(data);
      
      // If user is authenticated, fetch CSRF token
      if (data) {
        try {
          await csrfService.fetchToken();
          
        } catch (csrfError) {
          console.error('Failed to fetch CSRF token:', csrfError);
          // Don't fail authentication if CSRF token fetch fails
          // The token will be fetched on-demand later
        }
      } else {
        // No authenticated user, clear CSRF token
        csrfService.clearToken();
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      if (err instanceof Error && err.message.includes('401')) {
        // Not authenticated - clear the user and CSRF token
        setUser(null);
        csrfService.clearToken();
      } else {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await api.post('/api/auth/logout');
      setUser(null);
      csrfService.clearToken();
    } catch (err) {
      console.error("Error signing out:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isThrottled = false;
    const THROTTLE_TIME = 3000; // 3 seconds

    // This function silently checks auth status without causing a full reload
    const checkAuthStatus = async () => {
      if (isThrottled) {
        return;
      }
      isThrottled = true;
      setTimeout(() => { isThrottled = false; }, THROTTLE_TIME);

      try {
        const data = await api.get<User | null>('/api/auth/user');
        // Use the ref to get the current user, avoiding a stale closure
        if (data?.id !== userRef.current?.id) {
          console.log('Auth status changed in another tab. Updating session.');
          // Perform a full refetch to get all user data and CSRF token
          await fetchUser();
        }
      } catch (err) {
        // If the check fails (e.g., 401), and we thought a user was logged in, trigger a full fetch.
        // fetchUser() will handle the 401 and log the user out.
        if (userRef.current) {
          console.log('Auth check failed while user was logged in. Re-validating session.');
          await fetchUser();
        }
      }
    };

    const handleActivity = () => {
      if (document.visibilityState === 'visible') {
        checkAuthStatus();
      }
    };

    // Initial fetch on component mount
    fetchUser();

    // Listen for tab visibility changes and window focus
    document.addEventListener('visibilitychange', handleActivity);
    window.addEventListener('focus', handleActivity);

    // Cleanup listeners on component unmount
    return () => {
      document.removeEventListener('visibilitychange', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, []); // Empty dependency array ensures this runs only once.

  return (
    <AuthContext.Provider value={{ user, loading, error, refetch: fetchUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
