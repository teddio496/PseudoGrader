export interface CodeTestResult {
  // Basic test information
  testName: string;
  passed: boolean;
  executionTime: number;  // in milliseconds
  
  // Test output details
  output: string;        // Raw output from the test
  expectedOutput?: string; // Expected output (if applicable)
  actualOutput?: string;  // Actual output (if applicable)
  
  // Error information
  error?: {
    message: string;
    type: string;
    stackTrace?: string;
  };
  
  // Additional metadata
  timestamp: string;     // When the test was run
  testFile: string;      // Name of the test file
  testedFunction: string; // Name of the function being tested
  
  // Test statistics
  assertionsPassed?: number;
  assertionsFailed?: number;
  totalAssertions?: number;
  
  // Custom feedback
  feedback?: string;     // Any additional feedback or hints
  suggestions?: string[];// Improvement suggestions
  
  // Code coverage (optional)
  coverage?: {
    percentage: number;
    linesCovered: number;
    totalLines: number;
    uncoveredLines?: number[];
  };
} 