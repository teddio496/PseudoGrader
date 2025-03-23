"use client"

import { useState, useRef} from 'react';
import Editor from '@monaco-editor/react';
import Image from 'next/image';

interface FileItem {
  name: string;
  content: string | ArrayBuffer;
  type: string;
  preview?: string;
}

interface FileUploaderProps {
  questionId: string;
  onQuestionUpdate: (updates: {
    title?: string;
    status?: 'pending' | 'loading' | 'completed' | 'error';
    context?: string;
    pseudocode?: string;
    contextFiles?: FileItem[];
    pseudocodeFiles?: FileItem[];
    result?: { [key: string]: unknown };
  }) => void;
  initialStatus: 'pending' | 'loading' | 'completed' | 'error';
}

interface AnalysisResult {
  input_processing: {
    question: {
      content: string[];
    };
    pseudocode: {
      content: string[];
    };
  };
  code_generation: {
    code: string;
    testing_code: string;
  };
  logic_evaluation: {
    score: number;
    feedback: string;
    logical_analysis: string;
    potential_issues: string[];
  };
}

interface CodeTestResult {
  testName: string;
  lineNumber: number;
  passed: boolean;
  crash?: {
    line: number;
    message: string;
  };
}

export default function FileUploader({ onQuestionUpdate, initialStatus }: Omit<FileUploaderProps, 'questionId'>) {
  const [contextContent, setContextContent] = useState('');
  const [pseudocodeContent, setPseudocodeContent] = useState('');
  const [contextFiles, setContextFiles] = useState<FileItem[]>([]);
  const [pseudocodeFiles, setPseudocodeFiles] = useState<FileItem[]>([]);
  const [isContextEditorOpen, setIsContextEditorOpen] = useState(false);
  const [isPseudocodeEditorOpen, setIsPseudocodeEditorOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [codeTestResult, setCodeTestResult] = useState<CodeTestResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  const pseudocodeFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, isContext: boolean) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    selectedFiles.forEach(file => {
      if (!['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        console.error('Unsupported file type:', file.type);
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const newFile: FileItem = {
          name: file.name,
          content: e.target?.result || '',
          type: file.type,
        };

        // Create preview URL for images
        if (file.type.startsWith('image/')) {
          newFile.preview = URL.createObjectURL(file);
        }

        if (isContext) {
          setContextFiles(prev => [...prev, newFile]);
          onQuestionUpdate({ contextFiles: [...contextFiles, newFile] });
        } else {
          setPseudocodeFiles(prev => [...prev, newFile]);
          onQuestionUpdate({ pseudocodeFiles: [...pseudocodeFiles, newFile] });
        }
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleContextSave = () => {
    const contextFile: FileItem = {
      name: 'context.txt',
      content: contextContent,
      type: 'text/plain'
    };
    setContextFiles(prev => [...prev.filter(f => f.name !== 'context.txt'), contextFile]);
    onQuestionUpdate({ 
      context: contextContent,
      contextFiles: [...contextFiles.filter(f => f.name !== 'context.txt'), contextFile]
    });
    setIsContextEditorOpen(false);
  };

  const handleProcessFiles = async () => {
    setStatus('loading');
    setAnalysisResult(null);
    setCodeTestResult(null);

    try {
      const formData = new FormData();
      
      // Add context files
      const contextBlob = new Blob([contextContent], { type: 'text/plain' });
      formData.append('question_files', new File([contextBlob], 'context.txt', { type: 'text/plain' }));
      
      for (const file of contextFiles) {
        if (file.name !== 'context.txt') {
          const blob = new Blob([file.content], { type: file.type });
          formData.append('question_files', new File([blob], file.name, { type: file.type }));
        }
      }

      // Add pseudocode files
      const pseudocodeBlob = new Blob([pseudocodeContent], { type: 'text/plain' });
      formData.append('pseudocode_files', new File([pseudocodeBlob], 'pseudocode.txt', { type: 'text/plain' }));
      
      for (const file of pseudocodeFiles) {
        if (file.name !== 'pseudocode.txt') {
          const blob = new Blob([file.content], { type: file.type });
          formData.append('pseudocode_files', new File([blob], file.name, { type: file.type }));
        }
      }

      // First get the code generation
      const response = await fetch('http://localhost:8000/api/v1/getResponse/get-response', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze files');
      }
      
      const result = await response.json();
      console.log('Process files response:', result);

      // Now send the generated code to pytest
      const testResponse = await fetch('http://localhost:8000/api/v1/pytest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: result.code_generation.code,
          test_code: result.code_generation.testing_code
        })
      });

      if (!testResponse.ok) {
        throw new Error('Failed to run tests');
      }

      const testResult = await testResponse.json();
      console.log('Test results:', testResult);

      const processedTestResults: CodeTestResult[] = testResult.report.tests.map((test: any) => {
        const isTestPassed = test.outcome === 'passed';
        return {
          testName: test.nodeid,
          lineNumber: test.lineno,
          passed: isTestPassed,
          crash: !isTestPassed ? {
            line: test.call.crash.lineno,
            message: test.call.crash.message
          } : undefined
        };
      });
      
      setStatus('completed');
      setAnalysisResult(result);
      setCodeTestResult(processedTestResults[0]); // Save first test result for now
      onQuestionUpdate({ 
        pseudocode: pseudocodeContent,
        context: contextContent,
        status: 'completed',
        contextFiles: [...contextFiles.filter(f => f.name !== 'context.txt')],
        pseudocodeFiles: [...pseudocodeFiles.filter(f => f.name !== 'pseudocode.txt')],
        result: {
          ...result,
          testResults: processedTestResults
        }
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      setStatus('error');
      setAnalysisResult(null);
      setCodeTestResult(null);
      onQuestionUpdate({ status: 'error' });
    }
  };

  const handlePseudocodeSave = () => {
    const pseudocodeFile: FileItem = {
      name: 'pseudocode.txt',
      content: pseudocodeContent,
      type: 'text/plain'
    };
    setPseudocodeFiles(prev => [...prev.filter(f => f.name !== 'pseudocode.txt'), pseudocodeFile]);
    setIsPseudocodeEditorOpen(false);
  };

  const handleFilePreview = (file: FileItem) => {
    setSelectedFile(file);
  };

  const handleDeleteFile = (fileName: string, isContext: boolean) => {
    if (isContext) {
      setContextFiles(prev => prev.filter(f => f.name !== fileName));
      onQuestionUpdate({ contextFiles: contextFiles.filter(f => f.name !== fileName) });
    } else {
      setPseudocodeFiles(prev => prev.filter(f => f.name !== fileName));
      onQuestionUpdate({ pseudocodeFiles: pseudocodeFiles.filter(f => f.name !== fileName) });
    }
  };


  return (
    <div className="mx-auto space-y-6">

      <div className="flex flex-row gap-4">
      {/* Question Context Section */}
      <div className="flex-grow bg-[#444444] rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#E0E0E0]">Question Context</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => contextFileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-[#888888] transition-colors flex flex-row gap-2 border border-[#888888]"
            >
              <svg className="w-5 h-5 text-[#E0E0E0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[#E0E0E0]">Add Files</span>
            </button>
            <button 
              onClick={() => setIsContextEditorOpen(true)}
              className="p-2 rounded-lg hover:bg-[#888888] transition-colors flex flex-row gap-2 border border-[#888888]"
            >
              <svg className="w-5 h-5 text-[#E0E0E0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-[#E0E0E0]">Edit Context</span>
            </button>
          </div>
        </div>
        <input
          type="file"
          multiple
          accept=".txt,.pdf,image/*"
          onChange={(e) => handleFileChange(e, true)}
          className="hidden"
          ref={contextFileInputRef}
        />
        <div className="bg-[#121212] rounded p-4 min-h-[100px]">
          <pre className="text-[#E0E0E0] whitespace-pre-wrap mb-4">{contextContent || 'No context provided yet.'}</pre>
          {contextFiles.length > 0 && (
            <div className="border-t border-[#444444] pt-4">
              <h3 className="text-[#E0E0E0] text-sm mb-2">Attached Files:</h3>
              <ul className="space-y-2">
                {contextFiles.map((file, index) => (
                  <li 
                    key={index}
                    className="flex items-center p-2 bg-[#222222] rounded"
                  >
                    <span 
                      className="text-[#E0E0E0] flex-1 cursor-pointer hover:text-[#B0B0B0]"
                      onClick={() => handleFilePreview(file)}
                    >
                      {file.name}
                    </span>
                    {file.type.startsWith('image/') && (
                      <Image src={file.preview || ''} alt="preview" width={32} height={32} className="object-cover rounded mx-2" />
                    )}
                    <button
                      onClick={() => handleDeleteFile(file.name, true)}
                      className="text-[#EF5350] hover:text-[#FF7043] p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Pseudocode Section */}
      <div className="flex-grow bg-[#444444] rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#E0E0E0]">Pseudocode</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => pseudocodeFileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-[#888888] transition-colors flex flex-row gap-2 border border-[#888888]"
            >
              <svg className="w-5 h-5 text-[#E0E0E0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[#E0E0E0]">Add Files</span>
            </button>
            <button 
              onClick={() => setIsPseudocodeEditorOpen(true)}
              className="p-2 rounded-lg hover:bg-[#888888] transition-colors flex flex-row gap-2 border border-[#888888]"
            >
              <svg className="w-5 h-5 text-[#E0E0E0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-[#E0E0E0]">Edit Pseudocode</span>
            </button>
          </div>
        </div>
        <input
          type="file"
          multiple
          accept=".txt,.pdf,image/*"
          onChange={(e) => handleFileChange(e, false)}
          className="hidden"
          ref={pseudocodeFileInputRef}
        />
        <div className="bg-[#121212] rounded p-4 min-h-[100px]">
          <pre className="text-[#E0E0E0] whitespace-pre-wrap mb-4">{pseudocodeContent || 'No pseudocode provided yet.'}</pre>
          {pseudocodeFiles.length > 0 && (
            <div className="border-t border-[#444444] pt-4">
              <h3 className="text-[#E0E0E0] text-sm mb-2">Attached Files:</h3>
              <ul className="space-y-2">
                {pseudocodeFiles.map((file, index) => (
                  <li 
                    key={index}
                    className="flex items-center p-2 bg-[#222222] rounded"
                  >
                    <span 
                      className="text-[#E0E0E0] flex-1 cursor-pointer hover:text-[#B0B0B0]"
                      onClick={() => handleFilePreview(file)}
                    >
                      {file.name}
                    </span>
                    {file.type.startsWith('image/') && (
                      <Image src={file.preview || ''} alt="preview" width={32} height={32} className="object-cover rounded mx-2" />
                    )}
                    <button
                      onClick={() => handleDeleteFile(file.name, false)}
                      className="text-[#EF5350] hover:text-[#FF7043] p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 bg-[#121212] h-2 rounded-full overflow-hidden">
            {status === 'loading' && (
              <div className="h-full bg-[#FFA726] animate-pulse" />
            )}
            {status === 'completed' && (
              <div className="h-full bg-[#4CAF50]" />
            )}
            {status === 'error' && (
              <div className="h-full bg-[#EF5350]" />
            )}
          </div>
          <span className="text-[#E0E0E0] text-sm">
            {status === 'pending' && 'Not submitted'}
            {status === 'loading' && 'Analyzing...'}
            {status === 'completed' && 'Analysis complete'}
            {status === 'error' && 'Analysis failed'}
          </span>
        </div>
      </div>
      </div>
      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={() => setSelectedFile(null)}>
          <div className="rounded-lg w-full max-w-4xl bg-[#444444] p-4" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-[#E0E0E0] text-lg">{selectedFile.name}</h3>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[#E0E0E0] hover:text-[#B0B0B0]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-[#121212] rounded p-4 max-h-[600px] overflow-auto">
              {selectedFile.type.startsWith('image/') ? (
                <Image src={selectedFile.preview || ''} alt={selectedFile.name} width={800} height={600} className="max-w-full h-auto" />
              ) : selectedFile.type === 'text/plain' ? (
                <pre className="text-[#E0E0E0] whitespace-pre-wrap">{selectedFile.content as string}</pre>
              ) : (
                <div className="text-[#E0E0E0]">Preview not available for this file type</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Editor Modal */}
      {isContextEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="rounded-lg w-full max-w-4xl bg-[#444444]">
            <div className="h-[600px]">
              <Editor
                height="100%"
                defaultLanguage="plaintext"
                value={contextContent}
                onChange={(value: any) => setContextContent(value || '')}
                theme="vs-dark"
                className="pt-1"
                options={{
                  theme: 'vs-dark',
                  minimap: { enabled: false }
                }}
              />
            </div>
            <div className="p-4 border-t border-[#888888] flex justify-end gap-2">
              <button
                onClick={() => setIsContextEditorOpen(false)}
                className="px-4 py-2 bg-[#888888] hover:bg-[#B0B0B0] text-[#E0E0E0] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContextSave}
                className="px-4 py-2 bg-[#444444] text-[#E0E0E0] hover:bg-[#888888] rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pseudocode Editor Modal */}
      {isPseudocodeEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="rounded-lg w-full max-w-4xl bg-[#444444]">
            <div className="h-[600px]">
              <Editor
                height="100%"
                defaultLanguage="plaintext"
                value={pseudocodeContent}
                onChange={(value: any) => setPseudocodeContent(value || '')}
                theme="vs-dark"
                className="pt-1"
                options={{
                  theme: 'vs-dark',
                  minimap: { enabled: false }
                }}
              />
            </div>
            <div className="p-4 border-t border-[#888888] flex justify-end gap-2">
              <button
                onClick={() => setIsPseudocodeEditorOpen(false)}
                className="px-4 py-2 bg-[#888888] hover:bg-[#B0B0B0] text-[#E0E0E0] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePseudocodeSave}
                className="px-4 py-2 bg-[#444444] text-[#E0E0E0] hover:bg-[#888888] rounded-lg transition-colors"
              >
                Save & Analyze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Files Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={handleProcessFiles}
          disabled={status === 'loading'}
          className={`px-6 py-3 rounded-lg text-[#E0E0E0] font-semibold transition-colors flex items-center gap-2
            ${status === 'loading' 
              ? 'bg-[#666666] cursor-not-allowed' 
              : 'bg-[#4CAF50] hover:bg-[#45A049]'}`}
        >
          {status === 'loading' ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Process Files
            </>
          )}
        </button>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mt-8 bg-[#444444] rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-[#E0E0E0] mb-4">Analysis Results</h2>
          
          {/* Input Processing */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-[#E0E0E0] mb-2">Input Processing</h3>
            <div className="bg-[#333333] rounded p-4">
              <div className="mb-4">
                <h4 className="text-[#E0E0E0] font-medium mb-2">Question</h4>
                <pre className="text-[#B0B0B0] whitespace-pre-wrap">
                  {analysisResult.input_processing?.question?.content?.join('\n')}
                </pre>
              </div>
              <div>
                <h4 className="text-[#E0E0E0] font-medium mb-2">Pseudocode</h4>
                <pre className="text-[#B0B0B0] whitespace-pre-wrap">
                  {analysisResult.input_processing?.pseudocode?.content?.join('\n')}
                </pre>
              </div>
            </div>
          </div>

          {/* Code Generation */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-[#E0E0E0] mb-2">Generated Code</h3>
            <div className="bg-[#333333] rounded p-4">
              <pre className="text-[#B0B0B0] whitespace-pre-wrap">
                {analysisResult.code_generation?.code?.replace(/```python\n|```/g, '')}
              </pre>
            </div>
          </div>

          {/* Logic Evaluation */}
          <div>
            <h3 className="text-lg font-medium text-[#E0E0E0] mb-2">Logic Evaluation</h3>
            <div className="bg-[#333333] rounded p-4">
              <div className="mb-4">
                <span className="text-[#E0E0E0] font-medium">Score: </span>
                <span className="text-[#B0B0B0]">{analysisResult.logic_evaluation?.score}</span>
              </div>
              <div className="mb-4">
                <h4 className="text-[#E0E0E0] font-medium mb-2">Feedback</h4>
                <p className="text-[#B0B0B0] whitespace-pre-wrap">{analysisResult.logic_evaluation?.feedback}</p>
              </div>
              <div className="mb-4">
                <h4 className="text-[#E0E0E0] font-medium mb-2">Logical Analysis</h4>
                <p className="text-[#B0B0B0] whitespace-pre-wrap">{analysisResult.logic_evaluation?.logical_analysis}</p>
              </div>
              <div>
                <h4 className="text-[#E0E0E0] font-medium mb-2">Potential Issues</h4>
                <ul className="list-disc list-inside text-[#B0B0B0]">
                  {analysisResult.logic_evaluation?.potential_issues?.map((issue: string, index: number) => (
                    <li key={index} className="mb-2 whitespace-pre-wrap">{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}