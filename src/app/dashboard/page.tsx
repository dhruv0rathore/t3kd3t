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
  name: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
  provider: AuthProvider;
};

type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
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
      if (!session?.provider_token) throw new Error('No provider token');

      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
        },
      });
      const repos = await response.json();
      if (!response.ok) throw new Error(repos.message);
      
      setGithubRepos(repos);
      setShowRepoList(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRepositoryImport = async () => {
    if (!selectedRepo) {
      await fetchGithubRepos();
      return;
    }

    setImportLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: project, error } = await supabase
        .from('projects')
        .insert([
          {
            user_id: session.user.id,
            name: selectedRepo.name,
            full_name: selectedRepo.full_name,
            description: selectedRepo.description,
            status: 'pending',
            provider: authProvider,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (project) {
        setProjects(prev => [project, ...prev]);
        setSelectedRepo(null);
        setShowRepoList(false);
      }

      toast({
        title: "Repository Connected",
        description: "Your repository has been connected and is queued for analysis.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
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
                    onClick={handleRepositoryImport}
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