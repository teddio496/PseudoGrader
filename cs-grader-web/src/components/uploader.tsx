"use client"

import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import Image from 'next/image';
import Tests from './tests';

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
    analysisResult?: AnalysisResult;
    editableCode?: string;
    editableTests?: string;
  }) => void;
  initialStatus: 'pending' | 'loading' | 'completed' | 'error';
  initialContext?: string;
  initialPseudocode?: string;
  initialContextFiles?: FileItem[];
  initialPseudocodeFiles?: FileItem[];
  initialAnalysisResult?: AnalysisResult;
  initialEditableCode?: string;
  initialEditableTests?: string;
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
    logical_analysis: {
      correctness: string;
      efficiency: string;
      readability: string;
    };
    potential_issues: string[];
  };
  result?: {
    testResults: CodeTestResult[];
    report?: {
      created: number;
      duration: number;
      exitcode: number;
      summary: {
        passed: number;
        failed: number;
        total: number;
        collected: number;
      };
      tests: Array<{
        nodeid: string;
        lineno: number;
        outcome: string;
        call?: {
          crash?: {
            lineno: number;
            message: string;
          };
        };
      }>;
    };
  };
}

interface CodeTestResult {
  testName: string;
  lineNumber: number;
  passed: boolean;
  score?: {
    correctness: number;
    efficiency: number;
    readability: number;
  };
  crash?: {
    line: number;
    message: string;
  };
}

interface TestReport {
  nodeid: string;
  lineno: number;
  outcome: string;
  score?: {
    correctness: number;
    efficiency: number;
    readability: number;
  };
  call?: {
    crash?: {
      lineno: number;
      message: string;
    }
  }
}

export default function FileUploader({ 
  onQuestionUpdate, 
  initialStatus,
  initialContext = '',
  initialPseudocode = '',
  initialContextFiles = [],
  initialPseudocodeFiles = [],
  initialAnalysisResult = undefined,
  initialEditableCode = '',
  initialEditableTests = ''
}: FileUploaderProps) {
  const [contextContent, setContextContent] = useState(initialContext);
  const [pseudocodeContent, setPseudocodeContent] = useState(initialPseudocode);
  const [contextFiles, setContextFiles] = useState<FileItem[]>(initialContextFiles);
  const [pseudocodeFiles, setPseudocodeFiles] = useState<FileItem[]>(initialPseudocodeFiles);
  const [isContextEditorOpen, setIsContextEditorOpen] = useState(false);
  const [isPseudocodeEditorOpen, setIsPseudocodeEditorOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>(initialAnalysisResult);
  const [activeTab, setActiveTab] = useState<'code' | 'tests' | 'results' | 'test-results'>('code');
  const [editableCode, setEditableCode] = useState(initialEditableCode);
  const [editableTests, setEditableTests] = useState(initialEditableTests);
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  const pseudocodeFileInputRef = useRef<HTMLInputElement>(null);

  // Track if we need to update the parent
  const [pendingUpdates, setPendingUpdates] = useState<{
    context?: string;
    pseudocode?: string;
    contextFiles?: FileItem[];
    pseudocodeFiles?: FileItem[];
    analysisResult?: AnalysisResult;
    editableCode?: string;
    editableTests?: string;
  }>({});

  // Batch updates to prevent infinite loops
  useEffect(() => {
    if (Object.keys(pendingUpdates).length > 0) {
      onQuestionUpdate(pendingUpdates);
      setPendingUpdates({});
    }
  }, [pendingUpdates, onQuestionUpdate]);

  // Update handlers
  useEffect(() => {
    setPendingUpdates(prev => ({ ...prev, context: contextContent }));
  }, [contextContent]);

  useEffect(() => {
    setPendingUpdates(prev => ({ ...prev, pseudocode: pseudocodeContent }));
  }, [pseudocodeContent]);

  useEffect(() => {
    setPendingUpdates(prev => ({ ...prev, contextFiles }));
  }, [contextFiles]);

  useEffect(() => {
    setPendingUpdates(prev => ({ ...prev, pseudocodeFiles }));
  }, [pseudocodeFiles]);

  useEffect(() => {
    setPendingUpdates(prev => ({ ...prev, analysisResult }));
  }, [analysisResult]);

  useEffect(() => {
    setPendingUpdates(prev => ({ ...prev, editableCode }));
  }, [editableCode]);

  useEffect(() => {
    setPendingUpdates(prev => ({ ...prev, editableTests }));
  }, [editableTests]);

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
          // When it's an image, ensure content is stored as base64 data
          if (typeof newFile.content === 'string' && newFile.content.startsWith('blob:')) {
            // If somehow we got a blob URL instead of data, read as data URL again
            const imgReader = new FileReader();
            imgReader.onload = (imgEvent) => {
              newFile.content = imgEvent.target?.result || '';
              updateFiles(newFile, isContext);
            };
            imgReader.readAsDataURL(file);
            return;
          }
        }

        updateFiles(newFile, isContext);
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Helper function to update files state
  const updateFiles = (newFile: FileItem, isContext: boolean) => {
    if (isContext) {
      setContextFiles(prev => [...prev, newFile]);
      onQuestionUpdate({ contextFiles: [...contextFiles, newFile] });
    } else {
      setPseudocodeFiles(prev => [...prev, newFile]);
      onQuestionUpdate({ pseudocodeFiles: [...pseudocodeFiles, newFile] });
    }
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
    setAnalysisResult(undefined);
    setEditableCode(''); // Reset code when processing new files
    setEditableTests(''); // Reset tests when processing new files

    try {
      const formData = new FormData();
      
      // Add context files
      const contextBlob = new Blob([contextContent], { type: 'text/plain' });
      formData.append('question_files', new File([contextBlob], 'context.txt', { type: 'text/plain' }));
      
      for (const file of contextFiles) {
        if (file.name !== 'context.txt') {
          // Handle different content types appropriately
          let fileBlob;
          
          if (typeof file.content === 'string' && file.content.startsWith('data:')) {
            // Handle base64 data URLs for images
            const base64Data = file.content.split(',')[1];
            fileBlob = base64Data ? new Blob([Buffer.from(base64Data, 'base64')], { type: file.type }) : new Blob([''], { type: file.type });
          } else {
            // Handle text or other content
            fileBlob = new Blob([file.content], { type: file.type });
          }
          
          formData.append('question_files', new File([fileBlob], file.name, { type: file.type }));
        }
      }

      // Add pseudocode files
      const pseudocodeBlob = new Blob([pseudocodeContent], { type: 'text/plain' });
      formData.append('pseudocode_files', new File([pseudocodeBlob], 'pseudocode.txt', { type: 'text/plain' }));
      
      for (const file of pseudocodeFiles) {
        if (file.name !== 'pseudocode.txt') {
          // Handle different content types appropriately
          let fileBlob;
          
          if (typeof file.content === 'string' && file.content.startsWith('data:')) {
            // Handle base64 data URLs for images
            const base64Data = file.content.split(',')[1];
            fileBlob = base64Data ? new Blob([Buffer.from(base64Data, 'base64')], { type: file.type }) : new Blob([''], { type: file.type });
          } else {
            // Handle text or other content
            fileBlob = new Blob([file.content], { type: file.type });
          }
          
          formData.append('pseudocode_files', new File([fileBlob], file.name, { type: file.type }));
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
      //console.log('Process files response:', result);


      setStatus('completed');
      setAnalysisResult(result);
      onQuestionUpdate({ 
        pseudocode: pseudocodeContent,
        context: contextContent,
        status: 'completed',
        contextFiles: [...contextFiles.filter(f => f.name !== 'context.txt')],
        pseudocodeFiles: [...pseudocodeFiles.filter(f => f.name !== 'pseudocode.txt')],
        result: {
          ...result,
          testResults: result.result?.testResults || []
        }
      });
      handleRunTests();


    } catch (error) {
      console.error('Analysis failed:', error);
      setStatus('error');
      setAnalysisResult(undefined);
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

  const handleRunTests = async () => {
    setStatus('loading');
    try {
      const testResponse = await fetch('http://localhost:8000/api/v1/pytest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: editableCode,
          test_code: editableTests
        })
      });

      if (!testResponse.ok) {
        throw new Error('Failed to run tests');
      }

      const testResult = await testResponse.json();

      const processedTestResults: CodeTestResult[] = testResult.report.tests.map((test: TestReport) => ({
        testName: test.nodeid,
        lineNumber: test.lineno,
        passed: test.outcome === 'passed',
        score: test.score ? {
          correctness: Number(test.score.correctness) || 0,
          efficiency: Number(test.score.efficiency) || 0,
          readability: Number(test.score.readability) || 0
        } : undefined,
        crash: test.call?.crash ? {
          line: test.call.crash.lineno,
          message: test.call.crash.message
        } : undefined
      }));

      setAnalysisResult(prev => prev ? {
        ...prev,
        result: {
          testResults: processedTestResults,
          report: {
            created: testResult.report.created,
            duration: testResult.report.duration,
            exitcode: testResult.report.exitcode,
            summary: testResult.report.summary,
            tests: testResult.report.tests
          }
        }
      } : undefined);
      setStatus('completed');
    } catch (error) {
      console.error('Test run failed:', error);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (analysisResult && (!editableCode || !editableTests)) {
      // Only set the code if it's not already set
      setEditableCode(prev => prev || analysisResult.code_generation.code.replace(/```python\n|```/g, ''));
      setEditableTests(prev => prev || analysisResult.code_generation.testing_code.replace(/```python\n|```/g, ''));
    }
  }, [analysisResult, editableCode, editableTests]);

  return (
    <div className="flex h-screen gap-3 p-3">
      {/* Left Half - File Uploads */}
      <div className="w-1/2 flex flex-col h-full">
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          {/* Question Context Section */}
          <div className="bg-[#222222] rounded-lg shadow p-2 flex-shrink-0">
            <div className="flex justify-between items-center mb-2">
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
            <div className="flex flex-col">
              <div className="bg-[#121212] rounded p-2 max-h-[80px] overflow-y-auto mb-2">
                <pre className="text-[#E0E0E0] whitespace-pre-wrap text-sm">{contextContent || 'No context provided yet.'}</pre>
              </div>
              {contextFiles.length > 0 && (
                <div className="bg-[#1E1E1E] rounded p-2">
                  <h3 className="text-[#E0E0E0] text-xs mb-1">Attached Files:</h3>
                  <ul className="space-y-1">
                    {contextFiles.map((file, index) => (
                      <li 
                        key={index}
                        className="flex items-center p-1 bg-[#222222] rounded text-sm"
                      >
                        <span 
                          className="text-[#E0E0E0] flex-1 cursor-pointer hover:text-[#B0B0B0]"
                          onClick={() => handleFilePreview(file)}
                        >
                          {file.name}
                        </span>
                        {file.type.startsWith('image/') && (
                          <Image src={file.preview || ''} alt="preview" width={24} height={24} className="object-cover rounded mx-1" />
                        )}
                        <button
                          onClick={() => handleDeleteFile(file.name, true)}
                          className="text-[#EF5350] hover:text-[#FF7043] p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="flex-1 bg-[#222222] rounded-lg shadow p-2 min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
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
            <div className="flex flex-col h-full">
              <div className={`flex-1 bg-[#121212] rounded p-2 overflow-y-auto ${pseudocodeFiles.length > 0 ? 'mb-2' : ''}`}>
                {isPseudocodeEditorOpen ? (
                  <div className="h-full border border-[#444444] rounded-lg overflow-hidden">
                    <Editor
                      height="100%"
                      defaultLanguage="plaintext"
                      value={pseudocodeContent}
                      onChange={(value) => setPseudocodeContent(value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on'
                      }}
                    />
                  </div>
                ) : (
                  <pre className="text-[#E0E0E0] whitespace-pre-wrap text-sm">{pseudocodeContent || 'No pseudocode provided yet.'}</pre>
                )}
              </div>
              {pseudocodeFiles.length > 0 && (
                <div className="bg-[#1E1E1E] rounded p-2">
                  <ul className="space-y-1">
                    {pseudocodeFiles.map((file, index) => (
                      <li 
                        key={index}
                        className="flex items-center p-1 bg-[#222222] rounded text-sm"
                      >
                        <span 
                          className="text-[#E0E0E0] flex-1 cursor-pointer hover:text-[#B0B0B0]"
                          onClick={() => handleFilePreview(file)}
                        >
                          {file.name}
                        </span>
                        {file.type.startsWith('image/') && (
                          <Image src={file.preview || ''} alt="preview" width={24} height={24} className="object-cover rounded mx-1" />
                        )}
                        <button
                          onClick={() => handleDeleteFile(file.name, false)}
                          className="text-[#EF5350] hover:text-[#FF7043] p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          
          {/* Process Files Button */}
          <div className="flex justify-center py-2">
            <button
              onClick={handleProcessFiles}
              disabled={status === 'loading'}
              className={`p-2 rounded-lg flex flex-row gap-2 border transition-colors
                ${status === 'loading' 
                  ? 'bg-[#666666] cursor-not-allowed border-[#888888]' 
                  : 'hover:bg-[#888888] border-[#888888]'}`}
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-[#E0E0E0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-[#E0E0E0]">Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-[#E0E0E0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[#E0E0E0]">Process Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Half - Results */}
      <div className="w-1/2 p-4 bg-[#222222] rounded-lg overflow-auto">
        {analysisResult && (
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-[#222222] mb-4">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 ${activeTab === 'code' ? 'text-[#4CAF50] border-b-2 border-[#4CAF50]' : 'text-[#E0E0E0]'}`}
              >
                Code
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-4 py-2 ${activeTab === 'tests' ? 'text-[#4CAF50] border-b-2 border-[#4CAF50]' : 'text-[#E0E0E0]'}`}
              >
                Test Cases
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 ${activeTab === 'results' ? 'text-[#4CAF50] border-b-2 border-[#4CAF50]' : 'text-[#E0E0E0]'}`}
              >
                Results
              </button>
              <button
                onClick={() => setActiveTab('test-results')}
                className={`px-4 py-2 ${activeTab === 'test-results' ? 'text-[#4CAF50] border-b-2 border-[#4CAF50]' : 'text-[#E0E0E0]'}`}
              >
                Test Results
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-grow">
              {activeTab === 'code' && (
                <div className="h-full rounded-lg">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    value={editableCode}
                    onChange={(value) => setEditableCode(value || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14
                    }}
                  />
                </div>
              )}

              {activeTab === 'tests' && (
                <div className="h-full">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    value={editableTests}
                    onChange={(value) => setEditableTests(value || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14
                    }}
                  />
                </div>
              )}

              {activeTab === 'test-results' && (
                <div className="h-full">
                  {analysisResult?.result?.testResults && Array.isArray(analysisResult.result.testResults) && 
                    <Tests testResults={analysisResult.result.testResults} />
                  }
                </div>
              )}

              {activeTab === 'results' && (
                <div className="bg-[#222222] rounded-lg p-4 overflow-auto h-full">
                  <div className="mb-4">
                    <h3 className="text-3xl font-medium text-[#E0E0E0] mb-2">Logic Evaluation</h3>
                    <div className="bg-[#222222] rounded p-4">
                      <div className="mb-4">
                        <h4 className="text-2xl text-[#E0E0E0] font-medium mb-2">Test Summary</h4>
                        <div className="text-[#B0B0B0]">
                          {analysisResult.result?.report?.summary && (
                            <>
                              <p>Passed: {analysisResult.result.report.summary.passed}</p>
                              <p>Failed: {analysisResult.result.report.summary.failed}</p>
                              <p>Total: {analysisResult.result.report.summary.total}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mb-4">
                        <h4 className="text-2xl text-[#E0E0E0] font-medium mb-2">Feedback</h4>
                        <p className="text-[#B0B0B0] whitespace-pre-wrap">
                          {analysisResult.logic_evaluation?.feedback}
                        </p>
                      </div>
                      <div className="mb-4">
                        <h4 className="text-2xl text-[#E0E0E0] font-medium mb-2">Logical Analysis</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-xl text-[#E0E0E0] font-medium">Correctness</h5>
                            <p className="text-[#B0B0B0] whitespace-pre-wrap">
                              {analysisResult.logic_evaluation?.logical_analysis?.correctness}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-xl text-[#E0E0E0] font-medium">Efficiency</h5>
                            <p className="text-[#B0B0B0] whitespace-pre-wrap">
                              {analysisResult.logic_evaluation?.logical_analysis?.efficiency}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-xl text-[#E0E0E0] font-medium">Readability</h5>
                            <p className="text-[#B0B0B0] whitespace-pre-wrap">
                              {analysisResult.logic_evaluation?.logical_analysis?.readability}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl text-[#E0E0E0] font-medium mb-2">Potential Issues</h4>
                        <ul className="list-disc list-inside text-[#B0B0B0]">
                          {analysisResult.logic_evaluation?.potential_issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div> 
              )}
            </div>

            {/* Run Tests Button - Only show on code or tests tabs */}
            {(activeTab === 'code' || activeTab === 'tests') && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleRunTests}
                  disabled={status === 'loading'}
                  className={`px-6 py-2 rounded text-[#E0E0E0] font-semibold transition-colors flex items-center gap-2
                    ${status === 'loading' 
                      ? 'bg-[#666666] cursor-not-allowed' 
                      : 'bg-[#4CAF50] hover:bg-[#45A049]'}`}
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      Run Tests
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black opacity-50 flex items-center justify-center p-4 flex-grow" onClick={() => setSelectedFile(null)}>
          <div className="rounded-lg w-full max-w-4xl bg-[#222222] opacity-100 p-4" onClick={e => e.stopPropagation()}>
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
          <div className="rounded-lg w-full max-w-4xl bg-[#222222]">
            <div className="h-[600px]">
              <Editor
                height="100%"
                defaultLanguage="plaintext"
                value={contextContent}
                onChange={(value: string | undefined) => setContextContent(value || '')}
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
                className="px-4 py-2 bg-[#222222] text-[#E0E0E0] hover:bg-[#888888] rounded-lg transition-colors"
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
          <div className="rounded-lg w-full max-w-4xl bg-[#222222]">
            <div className="h-[600px]">
              <Editor
                height="100%"
                defaultLanguage="plaintext"
                value={pseudocodeContent}
                onChange={(value: string | undefined) => setPseudocodeContent(value || '')}
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
                className="px-4 py-2 bg-[#222222] text-[#E0E0E0] hover:bg-[#888888] rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}