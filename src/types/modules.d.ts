declare module 'escomplex' {
  interface HalsteadMetrics {
    difficulty: number;
    volume: number;
    effort: number;
    bugs: number;
  }

  interface SlocMetrics {
    logical: number;
    physical: number;
  }

  interface FunctionMetrics {
    name: string;
    cyclomatic: number;
    sloc: SlocMetrics;
  }

  interface ComplexityMetrics {
    aggregate: {
      cyclomatic: number;
      halstead: HalsteadMetrics;
      sloc: SlocMetrics;
    };
    maintainability: number;
    functions?: FunctionMetrics[];
  }

  export function analyse(code: string): ComplexityMetrics;
}

declare module 'jscpd' {
  interface JscpdOptions {
    path: string;
    threshold?: number;
    reporters?: string[];
    mode?: string;
    formatterOptions?: Record<string, string>;
    ignore?: string[];
  }

  interface DuplicationInstance {
    firstFile: { name: string };
    secondFile: { name: string };
    lines: number;
    fragment: string;
  }

  interface DuplicationReport {
    duplicates: DuplicationInstance[];
    statistics: {
      total: {
        percentage: number;
      };
    };
  }

  export class jscpd {
    constructor(options: JscpdOptions);
    detect(): Promise<DuplicationReport>;
  }
}