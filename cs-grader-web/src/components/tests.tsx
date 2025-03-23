import React, { useEffect } from 'react';

interface TestScore {
  correctness: number;
  efficiency: number;
  readability: number;
}

interface CodeTestResult {
  testName: string;
  lineNumber: number;
  passed: boolean;
  score?: TestScore;
  crash?: {
    line: number;
    message: string;
  };
}

interface TestsProps {
  testResults: CodeTestResult[];
}

export default function Tests({ testResults }: TestsProps) {

  useEffect(() => {
    console.log("hello")
    console.log(testResults)
  })


  if (!testResults || !Array.isArray(testResults)) {
    return (
      <div className="mt-8 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Test Results</h2>
        <div className="bg-[#333333] rounded p-4">
          <p className="text-[#B0B0B0]">No test results available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-[#333333] rounded-lg shadow p-3 h-full">
      <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Test Results</h2>
      <div className="bg-[#121212] rounded-lg p-4">
        <div className="space-y-4">
          {testResults.map((test, index) => {
            // Validate test object has required properties
            if (!test || typeof test !== 'object') {
              return (
                <div key={index} className="p-4 rounded-lg bg-[#af6464] border border-[#EF5350]">
                  <div className="text-[#E0E0E0]">Invalid test result</div>
                </div>
              );
            }
            return (
              <div 
                key={index}
                className={`p-4 rounded-lg ${
                  test.passed 
                    ? 'bg-[#28622c] border border-[#4CAF50]' 
                    : 'bg-[#7a3333] border border-[#EF5350]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-[#E0E0E0] font-medium">
                    Test: {test.testName || 'Unnamed Test'}
                  </h4>
                  <span className={`px-2 py-1 rounded text-sm ${
                    test.passed 
                      ? 'bg-[#4CAF50] text-white' 
                      : 'bg-[#EF5350] text-white'
                  }`}>
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div className="text-[#B0B0B0]">
                  {typeof test.lineNumber === 'number' && (
                    <p>Line Number: {test.lineNumber}</p>
                  )}
                  
                  {test.score && typeof test.score === 'object' && (
                    <div className="mt-2">
                      <p className="font-medium mb-2">Test Scores:</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm">Correctness</p>
                          <p className="text-[#4CAF50]">
                            {typeof test.score.correctness === 'number' 
                              ? test.score.correctness.toFixed(2)
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">Efficiency</p>
                          <p className="text-[#FFA726]">
                            {typeof test.score.efficiency === 'number'
                              ? test.score.efficiency.toFixed(2)
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">Readability</p>
                          <p className="text-[#42A5F5]">
                            {typeof test.score.readability === 'number'
                              ? test.score.readability.toFixed(2)
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!test.passed && test.crash && typeof test.crash === 'object' && (
                    <div className="mt-2">
                      <p className="font-medium">Error Details:</p>
                      {typeof test.crash.line === 'number' && (
                        <p>Line: {test.crash.line}</p>
                      )}
                      {typeof test.crash.message === 'string' && (
                        <p className="whitespace-pre-wrap">Message: {test.crash.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>)
          })}
        </div>
      </div>
    </div>
  );
}
