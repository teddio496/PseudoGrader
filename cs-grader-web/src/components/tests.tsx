import React from 'react';

interface CodeTestResult {
  testName: string;
  lineNumber: number;
  passed: boolean;
  crash?: {
    line: number;
    message: string;
  };
}

interface TestsProps {
  testResults: CodeTestResult[];
}

export default function Tests({ testResults }: TestsProps) {
  return (
    <div className="mt-8 bg-[#444444] rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Test Results</h2>
      <div className="bg-[#333333] rounded p-4">
        <div className="space-y-4">
          {testResults?.map((test, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg ${
                test.passed 
                  ? 'bg-[#1B5E20] border border-[#4CAF50]' 
                  : 'bg-[#B71C1C] border border-[#EF5350]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-[#E0E0E0] font-medium">Test: {test.testName}</h4>
                <span className={`px-2 py-1 rounded text-sm ${
                  test.passed 
                    ? 'bg-[#4CAF50] text-white' 
                    : 'bg-[#EF5350] text-white'
                }`}>
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="text-[#B0B0B0]">
                <p>Line Number: {test.lineNumber}</p>
                {!test.passed && test.crash && (
                  <div className="mt-2">
                    <p className="font-medium">Error Details:</p>
                    <p>Line: {test.crash.line}</p>
                    <p className="whitespace-pre-wrap">Message: {test.crash.message}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
