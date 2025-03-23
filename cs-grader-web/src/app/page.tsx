"use client"

import { useState, useEffect } from 'react';
import FileUploader from "@/components/uploader";
import Sidebar from "@/components/sidebar";

interface FileItem {
  name: string;
  content: string | ArrayBuffer;
  type: string;
  preview?: string;
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
    testResults: {
      testName: string;
      lineNumber: number;
      passed: boolean;
      crash?: {
        line: number;
        message: string;
      };
    }[];
  };
}

interface Question {
  id: string;
  title: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  context: string;
  pseudocode: string;
  contextFiles: FileItem[];
  pseudocodeFiles: FileItem[];
  result?: {
    [key: string]: unknown;
  };
  analysisResult?: AnalysisResult;
  editableCode?: string;
  editableTests?: string;
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const createEmptyQuestion = (): Question => ({
    id: `q-${Date.now()}`,
    title: `Question ${questions.length + 1}`,
    status: 'pending',
    context: '',
    pseudocode: '',
    contextFiles: [],
    pseudocodeFiles: [],
  });

  // Load questions from localStorage on initial render
  useEffect(() => {
    try {
      const savedQuestions = localStorage.getItem('questions');
      const savedActiveId = localStorage.getItem('activeQuestionId');
      
      if (savedQuestions) {
        const parsedQuestions = JSON.parse(savedQuestions);
        // Restore file previews for image files
        parsedQuestions.forEach((question: Question) => {
          question.contextFiles.forEach(file => {
            if (file.type.startsWith('image/') && file.content) {
              file.preview = file.content as string;
            }
          });
          question.pseudocodeFiles.forEach(file => {
            if (file.type.startsWith('image/') && file.content) {
              file.preview = file.content as string;
            }
          });
        });
        setQuestions(parsedQuestions);
      }
      if (savedActiveId) {
        setActiveQuestionId(savedActiveId);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setQuestions([]);
      setActiveQuestionId(null);
    }
  }, []);

  // Save questions to localStorage whenever they change
  useEffect(() => {
    try {
      // Create a copy of questions to modify before saving
      const questionsToSave = questions.map(question => ({
        ...question,
        contextFiles: question.contextFiles.map(file => ({
          ...file,
          // For image files, store the content as the preview URL
          content: file.type.startsWith('image/') ? file.preview : file.content,
          // Don't store preview separately as we'll reconstruct it on load
          preview: undefined
        })),
        pseudocodeFiles: question.pseudocodeFiles.map(file => ({
          ...file,
          content: file.type.startsWith('image/') ? file.preview : file.content,
          preview: undefined
        }))
      }));
      localStorage.setItem('questions', JSON.stringify(questionsToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [questions]);

  // Save active question ID whenever it changes
  useEffect(() => {
    try {
      if (activeQuestionId) {
        localStorage.setItem('activeQuestionId', activeQuestionId);
      }
    } catch (error) {
      console.error('Error saving active ID to localStorage:', error);
    }
  }, [activeQuestionId]);

  const handleAddQuestion = () => {
    const newQuestion = createEmptyQuestion();
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newQuestion.id);
  };

  const handleQuestionSelect = (id: string) => {
    setActiveQuestionId(id);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (activeQuestionId === id) {
      setActiveQuestionId(null);
    }
  };

  const handleQuestionUpdate = (questionId: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const activeQuestion = questions.find(q => q.id === activeQuestionId);

  return (
    <div className="min-h-screen bg-[#121212] flex">
      <Sidebar
        questions={questions}
        activeQuestionId={activeQuestionId}
        onQuestionSelect={handleQuestionSelect}
        onAddQuestion={handleAddQuestion}
        onDeleteQuestion={handleDeleteQuestion}
      />
      <div className="flex-1">
        {activeQuestion ? (
          <FileUploader
            key={activeQuestion.id}
            questionId={activeQuestion.id}
            onQuestionUpdate={(updates) => handleQuestionUpdate(activeQuestion.id, updates)}
            initialStatus={activeQuestion.status}
            initialContext={activeQuestion.context}
            initialPseudocode={activeQuestion.pseudocode}
            initialContextFiles={activeQuestion.contextFiles}
            initialPseudocodeFiles={activeQuestion.pseudocodeFiles}
            initialAnalysisResult={activeQuestion.analysisResult}
            initialEditableCode={activeQuestion.editableCode}
            initialEditableTests={activeQuestion.editableTests}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#888888] text-center">
              <p className="mb-4">No question selected</p>
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-[#444444] hover:bg-[#666666] text-[#E0E0E0] rounded-lg transition-colors"
              >
                Create Your First Question
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
