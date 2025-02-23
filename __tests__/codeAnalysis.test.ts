import { analyzeCode } from '@/lib/codeAnalysis';
import path from 'path';
import fs from 'fs';

describe('Code Analysis', () => {
  const sampleRepoPath = path.join(__dirname, 'fixtures', 'sample-repo');
  
  beforeAll(() => {
    // Create sample files for testing
    const sampleFiles = {
      'simple.ts': `
        function add(a: number, b: number): number {
          return a + b;
        }
        export default add;
      `,
      'complex.ts': `
        function calculateComplexity(data: any[]): number {
          let result = 0;
          for (let i = 0; i < data.length; i++) {
            if (data[i] > 10) {
              result += data[i] * 2;
            } else if (data[i] < 0) {
              result += Math.abs(data[i]);
            } else {
              result += data[i];
            }
            
            if (result > 100) {
              result = result * 0.9;
            }
          }
          return result;
        }
        export default calculateComplexity;
      `,
      'duplicate.ts': `
        export function helper(x: number): number {
          return x * 2;
        }
      `,
      'duplicate2.ts': `
        export function helperCopy(x: number): number {
          return x * 2;
        }
      `
    };

    // Create the files
    Object.entries(sampleFiles).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(sampleRepoPath, filename), content.trim());
    });
  });

  afterAll(() => {
    // Cleanup test files
    fs.rmSync(sampleRepoPath, { recursive: true, force: true });
  });

  it('should analyze code and return valid results', async () => {
    const results = await analyzeCode(sampleRepoPath);

    // Test structure
    expect(results).toHaveProperty('complexity');
    expect(results).toHaveProperty('duplication');
    expect(results).toHaveProperty('maintainability');
    expect(results).toHaveProperty('overview');

    // Test complexity analysis
    expect(results.complexity.score).toBeGreaterThan(0);
    expect(results.complexity.details).toHaveLength(4); // Our 4 test files
    
    // Test duplication detection
    expect(results.duplication.percentage).toBeGreaterThan(0);
    expect(results.duplication.instances).toHaveLength(1); // Our duplicated helper function

    // Test maintainability
    expect(results.maintainability.score).toBeGreaterThan(0);
    expect(results.maintainability.details).toHaveLength(4);

    // Test overview metrics
    expect(results.overview.totalFiles).toBe(4);
    expect(results.overview.totalLines).toBeGreaterThan(0);
    expect(results.overview.technicalDebtRatio).toBeGreaterThanOrEqual(0);

    // Test specific file analysis
    const complexFile = results.complexity.details.find(
      d => d.file.includes('complex.ts')
    );
    expect(complexFile).toBeDefined();
    expect(complexFile?.complexity).toBeGreaterThan(50); // Should have high complexity

    const simpleFile = results.complexity.details.find(
      d => d.file.includes('simple.ts')
    );
    expect(simpleFile).toBeDefined();
    expect(simpleFile?.complexity).toBeLessThan(50); // Should have low complexity
  });

  it('should handle empty directories', async () => {
    const emptyDir = path.join(__dirname, 'fixtures', 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    await expect(analyzeCode(emptyDir)).rejects.toThrow(
      'No JavaScript/TypeScript files found'
    );

    fs.rmdirSync(emptyDir);
  });

  it('should handle invalid files', async () => {
    const invalidFile = path.join(sampleRepoPath, 'invalid.ts');
    fs.writeFileSync(invalidFile, 'this is not valid typescript');

    const results = await analyzeCode(sampleRepoPath);
    expect(results.complexity.details.length).toBe(4); // Should still analyze valid files
  });
}); 