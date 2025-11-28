import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronDown, ChevronRight, Loader2, Lock, Check, PlusCircle } from 'lucide-react';
import { STAGING_API_URL } from '../config';
import { useToast } from '@/hooks/use-toast';
import csrfService from '../lib/csrf';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Organization {
  login: string;
  avatar_url: string;
}

interface OrgRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  updated_at: string;
  isRegistered: boolean;
}

export function OrgReposSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [registeringRepoId, setRegisteringRepoId] = useState<number | null>(null);

  // Only show this component to pool managers
  if (user?.role !== 'poolmanager') {
    return null;
  }

  // Fetch organizations where user is admin
  const { data: orgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['userAdminOrgs', user?.id],
    queryFn: async () => {
      const response = await fetch(`${STAGING_API_URL}/api/github/user/orgs`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to fetch organizations');
      }
      const data = await response.json();
      return data.orgs as Organization[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch repos for expanded org
  const { data: orgReposData, isLoading: isLoadingRepos } = useQuery({
    queryKey: ['orgRepos', expandedOrg],
    queryFn: async () => {
      if (!expandedOrg) return [];
      const response = await fetch(`${STAGING_API_URL}/api/github/orgs/${expandedOrg}/repos`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to fetch organization repositories');
      }
      const data = await response.json();
      return data.repos as OrgRepository[];
    },
    enabled: !!expandedOrg,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Register repository mutation
  const registerMutation = useMutation({
    mutationFn: async (repo: OrgRepository) => {
      const csrfToken = await csrfService.getToken();
      const storedInstallationId = localStorage.getItem('lastInstallationId');

      const response = await fetch(`${STAGING_API_URL}/api/repositories/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          githubRepoId: repo.id,
          githubRepoFullName: repo.full_name,
          installationId: storedInstallationId,
          _csrf: csrfToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Check if this is a GitHub App installation redirect
        if (errorData.installUrl) {
          localStorage.setItem('pendingRegistrationRepo', JSON.stringify(repo));
          window.location.href = errorData.installUrl;
          return { redirecting: true };
        }

        throw new Error(errorData?.error || 'Failed to register repository');
      }

      return { success: true, repoId: repo.id, fullName: repo.full_name };
    },
    onSuccess: (data) => {
      if (data.redirecting) return;

      toast({
        title: 'Success',
        description: 'Organization repository registered successfully'
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['orgRepos', expandedOrg] });
      queryClient.invalidateQueries({ queryKey: ['registeredRepositories', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['publicRepositories'] });
      setRegisteringRepoId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register repository',
        variant: 'destructive'
      });
      setRegisteringRepoId(null);
    }
  });

  const handleRegister = (repo: OrgRepository) => {
    setRegisteringRepoId(repo.id);
    registerMutation.mutate(repo);
  };

  const toggleOrg = (orgLogin: string) => {
    setExpandedOrg(expandedOrg === orgLogin ? null : orgLogin);
  };

  // Don't render if no organizations
  if (!isLoadingOrgs && (!orgsData || orgsData.length === 0)) {
    return null;
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Organization Repositories
        </CardTitle>
        <CardDescription>
          Register repositories from GitHub organizations you administer.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoadingOrgs ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        ) : (
          <div className="space-y-2">
            {orgsData?.map((org) => (
              <Collapsible
                key={org.login}
                open={expandedOrg === org.login}
                onOpenChange={() => toggleOrg(org.login)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={org.avatar_url}
                        alt={org.login}
                        className="h-8 w-8 rounded-full"
                      />
                      <span className="font-medium">{org.login}</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                        Admin
                      </Badge>
                    </div>
                    {expandedOrg === org.login ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2 ml-11 space-y-2">
                  {isLoadingRepos && expandedOrg === org.login ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                    </div>
                  ) : orgReposData?.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4">
                      No repositories found or all repositories are already registered.
                    </div>
                  ) : (
                    orgReposData?.map((repo) => (
                      <div
                        key={repo.id}
                        className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent/5 transition-colors"
                      >
                        <div className="overflow-hidden flex-1">
                          <div className="font-medium truncate">{repo.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {repo.description || repo.full_name}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {repo.private && (
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 border-purple-200 dark:border-purple-900">
                              <Lock className="h-3 w-3 mr-1" /> Private
                            </Badge>
                          )}

                          {repo.isRegistered ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                              <Check className="h-3 w-3 mr-1" /> Registered
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRegister(repo)}
                              disabled={registeringRepoId === repo.id || registerMutation.isPending}
                            >
                              {registeringRepoId === repo.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <PlusCircle className="mr-2 h-4 w-4" />
                              )}
                              Register
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
