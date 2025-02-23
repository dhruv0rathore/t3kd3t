import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { analyzeCode } from '@/lib/codeAnalysis';

const execAsync = promisify(exec);

// Add type for the error response
type ErrorResponse = {
  error: string;
  details?: unknown;
};

export async function POST(request: Request) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({
        error: 'Invalid JSON in request body',
        details: 'The request body could not be parsed as JSON'
      }, { status: 400 });
    }

    console.log('Received analysis request:', {
      projectId: body?.projectId,
      repoUrl: body?.repoUrl,
      provider: body?.provider
    });

    const { projectId, repoUrl, provider, accessToken } = body;

    // Validate request
    if (!projectId || !repoUrl || !provider || !accessToken) {
      const missingFields = Object.entries({ projectId, repoUrl, provider, accessToken })
        .filter(([_, value]) => !value)
        .map(([key]) => key);
      
      if (projectId) {
        await updateProjectStatus(projectId, 'failed', `Missing required fields: ${missingFields.join(', ')}`);
      }
      
      return NextResponse.json({
        error: 'Missing required fields',
        details: { missingFields }
      }, { status: 400 });
    }

    // Validate GitHub token from headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Invalid authorization header',
        details: 'Authorization header must start with Bearer'
      }, { status: 401 });
    }

    // Update project status to indicate analysis is starting
    const { error: updateError } = await supabase
      .from('projects')
      .update({ status: 'analyzing', error_message: null })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project status:', updateError);
      return NextResponse.json({
        error: 'Failed to update project status',
        details: updateError.message
      }, { status: 500 });
    }

    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp').replace(/\\/g, '/');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Create analysis directory with error handling
    const analysisDir = path.join(tmpDir, `analysis-${projectId}`).replace(/\\/g, '/');
    try {
      if (fs.existsSync(analysisDir)) {
        fs.rmSync(analysisDir, { recursive: true, force: true });
      }
      fs.mkdirSync(analysisDir, { recursive: true });
      console.log('Created analysis directory:', analysisDir);
    } catch (error) {
      console.error('Failed to create analysis directory:', error);
      await updateProjectStatus(projectId, 'failed', 'Failed to create analysis directory');
      return NextResponse.json({
        error: 'Failed to create analysis directory',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    try {
      // Clone with authentication
      const gitUrl = repoUrl.replace('https://', `https://oauth2:${accessToken}@`);
      console.log('Attempting to clone repository...');
      
      // Test Git access first
      try {
        console.log('Testing repository access with git ls-remote...');
        const { stdout: lsRemoteOutput, stderr: lsRemoteError } = await execAsync(`git ls-remote "${gitUrl}"`, {
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0'
          }
        });
        
        if (lsRemoteError) {
          console.warn('Git ls-remote warnings:', lsRemoteError);
        }
        
        if (!lsRemoteOutput) {
          throw new Error('Repository is not accessible');
        }
        console.log('Repository is accessible');
      } catch (gitError) {
        console.error('Failed to access repository:', gitError);
        await updateProjectStatus(projectId, 'failed', `Failed to access repository: ${gitError instanceof Error ? gitError.message : 'Unknown error'}`);
        return NextResponse.json({
          error: 'Failed to access repository',
          details: gitError instanceof Error ? gitError.message : 'Unknown error'
        }, { status: 401 });
      }

      // Clone repository
      console.log('Cloning repository to:', analysisDir);
      const { stdout, stderr } = await execAsync(`git clone "${gitUrl}" "${analysisDir}"`, {
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0'
        }
      });
      
      console.log('Clone output:', stdout);
      if (stderr) {
        console.warn('Clone warnings:', stderr);
      }

      // Verify the clone was successful
      if (!fs.existsSync(path.join(analysisDir, '.git'))) {
        throw new Error('Repository was not cloned properly - .git directory missing');
      }

      try {
        // Start analysis
        const analysisResults = await analyzeCode(analysisDir);
        console.log('Analysis completed successfully');

        // Update project with results
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            status: 'completed',
            analysis_results: analysisResults,
            analyzed_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (updateError) {
          throw new Error(`Failed to update analysis results: ${updateError.message}`);
        }

        return NextResponse.json({ status: 'completed', projectId });
      } catch (analysisError) {
        console.error('Analysis failed:', analysisError);
        await updateProjectStatus(projectId, 'failed', analysisError instanceof Error ? analysisError.message : 'Analysis failed');
        throw analysisError;
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      await updateProjectStatus(projectId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      return NextResponse.json({
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Request failed:', error);
    return NextResponse.json({
      error: 'Analysis request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function updateProjectStatus(projectId: string, status: 'analyzing' | 'completed' | 'failed', errorMessage?: string) {
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        status,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      console.error('Failed to update project status:', error);
    }
  } catch (error) {
    console.error('Error updating project status:', error);
  }
}

async function analyzeRepository(projectId: string, repoPath: string, accessToken: string) {
  console.log(`Starting analysis for project ${projectId} in path ${repoPath}`);
  try {
    // Verify the repository path exists and has content
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path ${repoPath} does not exist`);
    }

    const files = fs.readdirSync(repoPath);
    console.log('Repository contents:', files);

    if (files.length === 0) {
      throw new Error('Repository is empty');
    }

    // Use the sophisticated analysis from codeAnalysis.ts
    console.log('Starting code analysis...');
    const analysisResults = await analyzeCode(repoPath);
    console.log('Code analysis completed successfully');

    // Calculate overall health score
    console.log('Calculating overall score...');
    const overallScore = calculateOverallScore(analysisResults);
    console.log('Overall score:', overallScore);

    // Prepare analysis results
    const results = {
      ...analysisResults,
      overallScore,
      summary: generateAnalysisSummary(analysisResults),
      recommendations: generateRecommendations(analysisResults)
    };

    console.log('Updating project with analysis results...');
    // Update project with analysis results
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'completed',
        analysis_results: results,
        analyzed_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update analysis results:', updateError);
      throw new Error(`Failed to update analysis results: ${updateError.message}`);
    }

    console.log('Analysis results saved successfully');
  } catch (error) {
    console.error(`Analysis failed for project ${projectId}:`, error);
    
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log('Updating project status to failed with message:', errorMessage);
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', projectId);

      if (updateError) {
        console.error('Failed to update project status:', updateError);
      }
    } catch (dbError) {
      console.error('Failed to update project status in database:', dbError);
    }

    throw error; // Re-throw to be caught by the caller
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
        console.log('Cleaned up repository path');
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup repository:', cleanupError);
    }
  }
}

function calculateOverallScore(results: any): number {
  const weights = {
    complexity: 0.3,
    maintainability: 0.4,
    duplication: 0.3
  };

  const complexityScore = results.complexity.score;
  const maintainabilityScore = results.maintainability.score;
  const duplicationScore = 100 - results.duplication.percentage; // Invert duplication percentage

  return Math.round(
    complexityScore * weights.complexity +
    maintainabilityScore * weights.maintainability +
    duplicationScore * weights.duplication
  );
}

function generateAnalysisSummary(results: any): any {
  return {
    totalFiles: results.complexity.details.length,
    averageComplexity: results.complexity.score.toFixed(2),
    maintainabilityIndex: results.maintainability.score.toFixed(2),
    codeduplication: `${results.duplication.percentage.toFixed(2)}%`,
    criticalIssues: countCriticalIssues(results),
    healthStatus: getHealthStatus(calculateOverallScore(results))
  };
}

function countCriticalIssues(results: any): number {
  return results.maintainability.details.reduce((count: number, detail: any) => {
    return count + (detail.issues.length > 0 ? 1 : 0);
  }, 0);
}

function getHealthStatus(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Improvement';
}

function generateRecommendations(results: any): string[] {
  const recommendations: string[] = [];

  if (results.complexity.score > 70) {
    recommendations.push('Consider breaking down complex functions into smaller, more manageable pieces');
  }

  if (results.maintainability.score < 65) {
    recommendations.push('Focus on improving code maintainability through better documentation and simpler code structures');
  }

  if (results.duplication.percentage > 15) {
    recommendations.push('Reduce code duplication by extracting common functionality into shared components or utilities');
  }

  // Add specific file recommendations
  results.maintainability.details
    .filter((detail: any) => detail.issues.length > 0)
    .slice(0, 3) // Top 3 issues
    .forEach((detail: any) => {
      recommendations.push(`Improve maintainability in ${detail.file}: ${detail.issues[0]}`);
    });

  return recommendations;
} 