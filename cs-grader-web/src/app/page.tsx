"use client"

import { useState } from 'react';
import FileUploader from "@/components/uploader";
import Sidebar from "@/components/sidebar";

interface Question {
  id: string;
  title: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  context: string;
  pseudocode: string;
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      title: `Question ${questions.length + 1}`,
      status: 'pending',
      context: '',
      pseudocode: ''
    };
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newQuestion.id);
  };

  const handleQuestionSelect = (id: string) => {
    setActiveQuestionId(id);
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
      />
      <div className="flex-1 p-6">
        {activeQuestion ? (
          <FileUploader
            key={activeQuestion.id}
            onQuestionUpdate={(updates) => handleQuestionUpdate(activeQuestion.id, updates)}
            initialStatus={activeQuestion.status}
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
