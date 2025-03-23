"use client"

interface Question {
  id: string;
  title: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
}

interface SidebarProps {
  questions: Question[];
  activeQuestionId: string | null;
  onQuestionSelect: (id: string) => void;
  onAddQuestion: () => void;
  onDeleteQuestion: (id: string) => void;
}

export default function Sidebar({ questions, activeQuestionId, onQuestionSelect, onAddQuestion, onDeleteQuestion }: SidebarProps) {
  return (
    <div className="w-64 h-screen bg-[#222222] p-4 flex flex-col">
      <h2 className="text-[#E0E0E0] text-xl font-semibold mb-4">Questions</h2>
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {questions.map((question) => (
            <li
              key={question.id}
              className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${
                activeQuestionId === question.id
                  ? 'bg-[#888888]'
                  : 'hover:bg-[#666666]'
              }`}
            >
              <span 
                className="text-[#E0E0E0] truncate flex-1"
                onClick={() => onQuestionSelect(question.id)}
              >
                {question.title || 'Untitled Question'}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{
                    backgroundColor: 
                      question.status === 'completed' ? '#4CAF50' :
                      question.status === 'loading' ? '#FFA726' :
                      question.status === 'error' ? '#EF5350' :
                      '#888888'
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this question?')) {
                      onDeleteQuestion(question.id);
                    }
                  }}
                  className="text-[#EF5350] hover:text-[#FF7043] p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onAddQuestion}
        className="mt-4 w-full p-2 bg-[#121212] hover:bg-[#2A2A2A] text-[#E0E0E0] rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Question
      </button>
    </div>
  );
} 