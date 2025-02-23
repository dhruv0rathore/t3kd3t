'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

type Project = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  git_url: string;
  default_branch: string;
  user_id: string;
  provider: 'github' | 'gitlab' | 'email';
  status: 'pending_analysis' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
};

type AnalysisResult = {
  code_quality: {
    score: number;
    issues: Array<{
      severity: 'low' | 'medium' | 'high';
      message: string;
      file: string;
      line: number;
    }>;
  };
  security: {
    vulnerabilities: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      location: string;
    }>;
  };
  performance: {
    score: number;
    suggestions: string[];
  };
};

export default function ProjectAnalysis() {
  const router = useRouter();
  const { projectId } = useParams();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectDetails() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/signin');
          return;
        }

        // Fetch project details
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        if (!project) {
          toast({
            title: "Project not found",
            description: "The requested project could not be found.",
            variant: "destructive",
          });
          router.push('/dashboard');
          return;
        }

        setProject(project);

        // Fetch analysis results if project is completed
        if (project.status === 'completed') {
          const { data: analysis, error: analysisError } = await supabase
            .from('analysis_results')
            .select('*')
            .eq('project_id', projectId)
            .single();

          if (!analysisError && analysis) {
            setAnalysisResult(analysis.results);
          }
        }
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

    fetchProjectDetails();
  }, [projectId, router, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#00FF94]"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0B]/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
              project.status === 'analyzing' ? 'bg-blue-500/20 text-blue-400' :
              project.status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
            </span>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 container mx-auto px-4">
        {project.status === 'pending_analysis' && (
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
              <p className="text-yellow-400">Project is queued for analysis. This may take a few minutes...</p>
            </div>
          </div>
        )}

        {project.status === 'analyzing' && (
          <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <p className="text-blue-400">Analysis in progress. Please wait...</p>
            </div>
          </div>
        )}

        {project.status === 'failed' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-400">Analysis failed. Please try reimporting the project.</p>
            </div>
          </div>
        )}

        {project.status === 'completed' && analysisResult && (
          <div className="space-y-8">
            {/* Code Quality Section */}
            <section className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Code Quality Analysis</h2>
              <div className="flex items-center space-x-4 mb-6">
                <div className="text-4xl font-bold text-green-400">{analysisResult.code_quality.score}%</div>
                <div className="text-sm text-gray-400">Overall Code Quality Score</div>
              </div>
              
              {analysisResult.code_quality.issues.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Issues Found</h3>
                  {analysisResult.code_quality.issues.map((issue, index) => (
                    <div key={index} className="p-4 bg-gray-800/50 rounded border border-gray-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            issue.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                            issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <p className="mt-2">{issue.message}</p>
                          <p className="text-sm text-gray-400 mt-1">{issue.file}:{issue.line}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  No code quality issues found
                </div>
              )}
            </section>

            {/* Security Section */}
            <section className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Security Analysis</h2>
              {analysisResult.security.vulnerabilities.length > 0 ? (
                <div className="space-y-4">
                  {analysisResult.security.vulnerabilities.map((vuln, index) => (
                    <div key={index} className="p-4 bg-gray-800/50 rounded border border-gray-700">
                      <div className="flex items-start space-x-4">
                        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                          vuln.severity === 'critical' ? 'text-red-500' :
                          vuln.severity === 'high' ? 'text-orange-500' :
                          vuln.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            vuln.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            vuln.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            vuln.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {vuln.severity.toUpperCase()}
                          </span>
                          <p className="mt-2">{vuln.description}</p>
                          <p className="text-sm text-gray-400 mt-1">{vuln.location}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-green-400 py-4">
                  <CheckCircle className="h-5 w-5" />
                  <span>No security vulnerabilities found</span>
                </div>
              )}
            </section>

            {/* Performance Section */}
            <section className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Performance Analysis</h2>
              <div className="flex items-center space-x-4 mb-6">
                <div className="text-4xl font-bold text-green-400">{analysisResult.performance.score}%</div>
                <div className="text-sm text-gray-400">Performance Score</div>
              </div>
              
              {analysisResult.performance.suggestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Optimization Suggestions</h3>
                  <ul className="space-y-2">
                    {analysisResult.performance.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-gray-400">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}