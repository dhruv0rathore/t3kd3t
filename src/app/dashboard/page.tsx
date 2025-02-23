'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

type AuthProvider = 'github' | 'gitlab' | 'email';

type Project = {
  id: string;
  user_id: string;
  name: string;
  full_name?: string;
  description?: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  provider: AuthProvider;
  git_url?: string;
  html_url?: string;
  default_branch?: string;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
  analysis_results?: any | null;
  analyzed_at?: string | null;
};

type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
};

type PostgrestError = {
  message: string;
  details: string;
  hint: string;
  code: string;
};

type PostgrestResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
  status: number;
  statusText: string;
};

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [showRepoList, setShowRepoList] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    async function initializeDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/signin');
          return;
        }

        // Set auth provider based on session
        setAuthProvider(session.user.app_metadata.provider as AuthProvider);

        // Fetch user's projects
        const { data: userProjects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(userProjects || []);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    initializeDashboard();
  }, [router, toast]);

  const fetchGithubRepos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        // Re-authenticate to get fresh token with proper scopes
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
            scopes: 'repo read:user'
          }
        });
        if (error) throw error;
        return;
      }

      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch repositories');
      }
      
      const repos = await response.json();
      setGithubRepos(repos);
      setShowRepoList(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch repositories",
        variant: "destructive",
      });
      // If token is invalid, trigger re-authentication
      if (error.message?.includes('401')) {
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
            scopes: 'repo read:user'
          }
        });
      }
    }
  };

  const handleRepositoryImport = async (repoUrl: string) => {
    setIsAnalyzing(true);
    let projectId: string | null = null;

    try {
      console.log('Starting repository import with URL:', repoUrl);

      // Validate repository URL
      if (!repoUrl.startsWith('https://github.com/')) {
        throw new Error('Invalid repository URL. Please provide a valid GitHub repository URL.');
      }

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session:', session ? 'Found' : 'Not found');
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to analyze repositories",
          variant: "destructive"
        });
        return;
      }

      // Get GitHub token from session
      const githubToken = session.provider_token;
      console.log('GitHub token:', githubToken ? 'Present' : 'Missing');
      
      if (!githubToken) {
        toast({
          title: "GitHub Token Missing",
          description: "Please reconnect your GitHub account",
          variant: "destructive"
        });
        
        // Trigger GitHub re-authentication
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            scopes: 'repo read:user'
          }
        });
        return;
      }

      // Extract repository name from URL
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || '';
      console.log('Repository name:', repoName);

      // Create project in database with minimal required fields
      console.log('Creating project with data:', {
        name: repoName,
        git_url: repoUrl,
        user_id: session.user.id,
        provider: 'github',
        status: 'analyzing'
      });

      // First, verify the user's session and role
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Failed to verify user authentication');
      }

      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Try to create the project with error debugging
      const createResult: PostgrestResponse<Project> = await supabase
        .from('projects')
        .insert({
          name: repoName,
          git_url: repoUrl,
          user_id: user.id,
          provider: 'github',
          status: 'analyzing'
        })
        .select()
        .single();

      // Log the entire response first
      console.log('Raw Supabase Response:', createResult);

      // Handle errors with proper type checking
      if (createResult.error) {
        let errorMessage = 'Failed to create project';
        let errorCode = null;
        
        // Safely access error properties
        if (typeof createResult.error === 'object' && createResult.error !== null) {
          const error = createResult.error as PostgrestError;
          errorMessage = error.message || errorMessage;
          errorCode = error.code;
          
          // Log the error details safely
          console.error('Project creation failed:', error?.message || 'Unknown error', {
            message: errorMessage || 'No message available',
            code: errorCode || 'No code available',
            status: createResult?.status || 'unknown'
          });

          // Handle specific error codes
          if (errorCode === '42501' || createResult.status === 401) {
            throw new Error('Authentication error. Please sign in again.');
          } else if (errorCode === '42P01') {
            throw new Error('Database table not found. Please contact support.');
          } else if (errorCode === '23505') {
            throw new Error('A project with this name already exists.');
          } else if (errorCode === '23503') {
            throw new Error('Invalid user ID or missing required fields.');
          }
        } else {
          console.error('Unexpected error format:', createResult.error);
        }

        throw new Error(errorMessage);
      }

      if (!createResult.data) {
        console.error('No data returned from project creation');
        throw new Error('Project creation failed: No data returned');
      }

      const project = createResult.data;
      projectId = project.id;
      console.log('Successfully created project:', project);

      // Start analysis with all required parameters
      console.log('Starting analysis with data:', {
        projectId: project.id,
        repoUrl,
        provider: 'github'
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`
        },
        body: JSON.stringify({
          projectId: project.id,
          repoUrl,
          provider: 'github',
          accessToken: githubToken
        })
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { error: 'Failed to parse response' };
      }

      if (!response.ok) {
        console.error('Analysis API error:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData?.error || 'Unknown error',
          details: responseData?.details
        });
        
        // Update project status to failed
        await supabase
          .from('projects')
          .update({
            status: 'failed',
            error_message: responseData?.error || 'Analysis failed to start'
          })
          .eq('id', project.id);
        
        if (response.status === 401) {
          toast({
            title: "Authentication Failed",
            description: "GitHub authentication failed. Please reconnect your GitHub account",
            variant: "destructive"
          });
          // Trigger GitHub re-authentication
          await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
              redirectTo: `${window.location.origin}/dashboard`,
              scopes: 'repo read:user'
            }
          });
        } else if (response.status === 404) {
          toast({
            title: "Repository Not Found",
            description: "Please check the repository URL",
            variant: "destructive"
          });
        } else if (responseData.error) {
          toast({
            title: "Analysis Failed",
            description: responseData.error,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Analysis Error",
            description: "Failed to start analysis. Please try again",
            variant: "destructive"
          });
        }
        
        throw new Error(`Analysis failed: ${responseData.error || response.statusText}`);
      }

      console.log('Analysis API response:', responseData);

      // Poll for analysis completion with better error handling
      const maxAttempts = 30; // 5 minutes with 10-second intervals
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for project ${project.id}`);
        
        const { data: updatedProject, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', project.id)
          .single();

        if (fetchError) {
          console.error('Error fetching project status:', fetchError);
          continue;
        }

        console.log('Project status update:', {
          id: updatedProject?.id,
          status: updatedProject?.status,
          analyzed_at: updatedProject?.analyzed_at,
          error_message: updatedProject?.error_message
        });

        if (!updatedProject) {
          throw new Error('Project not found during status check');
        }

        if (updatedProject.status === 'completed') {
          toast({
            title: "Analysis Complete",
            description: "Repository analysis completed successfully!",
            variant: "default"
          });
          router.refresh();
          break;
        } else if (updatedProject.status === 'failed') {
          toast({
            title: "Analysis Failed",
            description: updatedProject.error_message || 'Unknown error occurred during analysis',
            variant: "destructive"
          });
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Analysis timed out');
      }

    } catch (error: unknown) {
      // First log the raw error for debugging
      console.log('Raw error caught:', error);

      // Create a structured error object
      const errorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        details: error instanceof Object ? error : undefined
      };

      // Log the structured error
      console.error('Repository import failed:', errorInfo?.message || 'Unknown error', {
        ...(errorInfo || {}),
        timestamp: new Date().toISOString()
      });
      
      // Update project status if we have a project ID
      if (projectId) {
        try {
          const { error: updateError } = await supabase
            .from('projects')
            .update({
              status: 'failed',
              error_message: errorInfo.message
            })
            .eq('id', projectId);

          if (updateError) {
            console.error('Failed to update project status:', {
              error: updateError,
              projectId
            });
          }
        } catch (updateError) {
          console.error('Error updating project status:', {
            error: updateError instanceof Error ? updateError.message : updateError,
            projectId
          });
        }
      }

      // Show error toast to user
      toast({
        title: "Analysis Error",
        description: errorInfo.message,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create a new project entry for the uploaded file
      const { data: project, error } = await supabase
        .from('projects')
        .insert([
          {
            user_id: session.user.id,
            name: file.name.replace('.zip', ''),
            status: 'pending',
            provider: 'email',
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add the new project to the list
      if (project) {
        setProjects(prev => [project, ...prev]);
      }

      toast({
        title: "Project Uploaded",
        description: "Your project has been uploaded and is queued for analysis.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#00FF94]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0B]/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-[#00FF94] via-[#00E0F3] to-[#00B3FF] bg-clip-text text-transparent">T3KDET</span>
            </div>
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Project Analysis Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(authProvider === 'github' || authProvider === 'gitlab') && (
              <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg backdrop-blur-sm">
                <h2 className="text-xl font-semibold mb-4">Import from {authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}</h2>
                <p className="text-gray-400 mb-4">Select and analyze repositories directly from your {authProvider} account.</p>
                <div className="relative">
                  <Button 
                    className="bg-gradient-to-r from-[#00FF94] to-[#00B3FF] text-black hover:opacity-90 w-full"
                    onClick={() => {
                      if (selectedRepo) {
                        handleRepositoryImport(`https://github.com/${selectedRepo.full_name}.git`);
                      } else {
                        fetchGithubRepos();
                      }
                    }}
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : selectedRepo ? (
                      'Analyze Repository'
                    ) : (
                      `Connect ${authProvider.charAt(0).toUpperCase() + authProvider.slice(1)} Repository`
                    )}
                  </Button>
                  {showRepoList && githubRepos.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {githubRepos.map((repo) => (
                        <button
                          key={repo.id}
                          className="w-full px-4 py-2 text-left hover:bg-gray-800 focus:outline-none focus:bg-gray-800"
                          onClick={() => {
                            setSelectedRepo(repo);
                            setShowRepoList(false);
                          }}
                        >
                          <div className="font-medium">{repo.name}</div>
                          {repo.description && (
                            <div className="text-sm text-gray-400 truncate">{repo.description}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedRepo && (
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                    <div className="font-medium">{selectedRepo.name}</div>
                    {selectedRepo.description && (
                      <div className="text-sm text-gray-400">{selectedRepo.description}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-4">Upload Project ZIP</h2>
              <p className="text-gray-400 mb-4">Upload your project as a ZIP file for analysis.</p>
              <Input
                type="file"
                accept=".zip"
                className="mb-4"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (!file.name.endsWith('.zip')) {
                    toast({
                      title: "Invalid File",
                      description: "Please upload a ZIP file",
                      variant: "destructive",
                    });
                    return;
                  }

                  await handleFileUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="mt-12 p-6 bg-gray-900/50 border border-gray-800 rounded-lg backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-6">Analysis Results</h2>
            <div className="grid gap-4">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <div key={project.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-white">{project.name}</h3>
                        <p className="text-sm text-gray-400">
                          Added {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        project.status === 'analyzing' ? 'bg-blue-500/20 text-blue-400' :
                        project.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center space-x-4">
                      <Button
                        variant="outline"
                        className="text-sm border-gray-700"
                        onClick={() => router.push(`/dashboard/${project.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No projects found. Import a repository or upload a ZIP file to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}