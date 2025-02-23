import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

type AnalysisResult = {
  complexity: {
    score: number;
    details: Array<{
      file: string;
      complexity: number;
      maintainability: number;
    }>;
  };
  duplication: {
    percentage: number;
    instances: Array<{
      files: string[];
      lines: number;
      fragment: string;
    }>;
  };
  maintainability: {
    score: number;
    details: Array<{
      file: string;
      score: number;
      issues: string[];
    }>;
  };
};

export async function analyzeCode(projectPath: string): Promise<AnalysisResult> {
  try {
    console.log('Starting code analysis for:', projectPath);
    
    // Get all files
    const files = getAllFiles(projectPath, ['.ts', '.tsx', '.js', '.jsx']);
    console.log(`Found ${files.length} files to analyze`);

    // Basic analysis
    const fileAnalyses = files.map(file => {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const complexity = calculateBasicComplexity(content);
      const maintainability = calculateBasicMaintainability(content);
      
      return {
        file: file.replace(projectPath, ''),
        complexity,
        maintainability,
        lines: lines.length
      };
    });

    // Calculate scores
    const complexityScore = calculateOverallScore(fileAnalyses.map(f => f.complexity));
    const maintainabilityScore = calculateOverallScore(fileAnalyses.map(f => f.maintainability));

    return {
      complexity: {
        score: complexityScore,
        details: fileAnalyses.map(({ file, complexity, maintainability }) => ({
          file,
          complexity,
          maintainability
        }))
      },
      duplication: {
        percentage: 0, // Basic implementation
        instances: []
      },
      maintainability: {
        score: maintainabilityScore,
        details: fileAnalyses.map(({ file, maintainability }) => ({
          file,
          score: maintainability,
          issues: []
        }))
      }
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...getAllFiles(fullPath, extensions));
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  return files;
}

function calculateBasicComplexity(content: string): number {
  const lines = content.split('\n');
  const ifCount = (content.match(/if\s*\(/g) || []).length;
  const forCount = (content.match(/for\s*\(/g) || []).length;
  const whileCount = (content.match(/while\s*\(/g) || []).length;
  const switchCount = (content.match(/switch\s*\(/g) || []).length;
  
  // Basic complexity calculation
  const complexity = 1 + ifCount + forCount + whileCount + switchCount;
  return Math.min(100, (complexity / lines.length) * 100);
}

function calculateBasicMaintainability(content: string): number {
  const lines = content.split('\n');
  const commentCount = (content.match(/\/\//g) || []).length + (content.match(/\/\*[\s\S]*?\*\//g) || []).length;
  const functionCount = (content.match(/function\s+\w+\s*\(/g) || []).length;
  
  // Basic maintainability calculation
  const ratio = (commentCount + functionCount) / lines.length;
  return Math.min(100, ratio * 100);
}

function calculateOverallScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}