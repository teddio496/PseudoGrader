"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

interface CodeTab {
  id: string;
  code: string;
  filename: string;
  isMinimized: boolean;
}

export default function PageDibya() {
  const [editors, setEditors] = useState<CodeTab[]>([]);
  const [saveStatus, setSaveStatus] = useState<{[key: string]: string}>({});
  const [sendStatus, setSendStatus] = useState<string>('');

  // Function to save code
  const saveCode = async (codeToSave: string, editorId: string) => {
    try {
      const editor = editors.find(e => e.id === editorId);
      if (!editor) return;

      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: codeToSave,
          filename: editor.filename 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      const result = await response.json();
      if (result.success) {
        setSaveStatus(prev => ({
          ...prev,
          [editorId]: 'Saved'
        }));
        setTimeout(() => {
          setSaveStatus(prev => ({
            ...prev,
            [editorId]: ''
          }));
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving:', err);
      setSaveStatus(prev => ({
        ...prev,
        [editorId]: 'Save failed'
      }));
    }
  };

  // Function to add a new editor
  const addNewEditor = async () => {
    const newEditorId = `editor-${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `code-${timestamp}.txt`;
    const defaultCode = "def function():\n    pass";
    
    const newEditor: CodeTab = {
      id: newEditorId,
      code: defaultCode,
      filename: filename,
      isMinimized: false
    };

    try {
      // Create the file immediately
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: defaultCode,
          filename: filename 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create file');
      }

      setEditors(prev => [...prev, newEditor]);
      setSaveStatus(prev => ({
        ...prev,
        [newEditorId]: 'File created'
      }));
      setTimeout(() => {
        setSaveStatus(prev => ({
          ...prev,
          [newEditorId]: ''
        }));
      }, 2000);

    } catch (err) {
      console.error('Error creating file:', err);
      alert('Failed to create new file. Please try again.');
    }
  };

  // Function to remove an editor
  const removeEditor = async (editorId: string) => {
    const editor = editors.find(e => e.id === editorId);
    if (!editor) return;

    try {
      // Delete the file first
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: editor.filename })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }

      // If file deletion was successful, remove the editor from state
      setEditors(editors.filter(e => e.id !== editorId));
      setSaveStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[editorId];
        return newStatus;
      });
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete the file. Please try again.');
    }
  };

  // Function to toggle editor minimization
  const toggleMinimize = (editorId: string) => {
    setEditors(editors.map(editor =>
      editor.id === editorId 
        ? { ...editor, isMinimized: !editor.isMinimized }
        : editor
    ));
  };

  // Function to update code in editor state (without saving)
  const updateEditorCode = (editorId: string, newCode: string) => {
    setEditors(editors.map(editor => 
      editor.id === editorId ? { ...editor, code: newCode } : editor
    ));
  };

  // Function to send all files to the API
  const sendAllFiles = async () => {
    try {
      setSendStatus('Sending files...');
      console.log('Starting to send files...');
      
      const response = await fetch('/api/send_text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send files');
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      // Show more detailed success message
      const successMessage = `Success! ${result.files_sent || 0} files sent to API`;
      setSendStatus(successMessage);
      
      // Clear the status after 5 seconds
      setTimeout(() => {
        setSendStatus('');
      }, 5000);
    } catch (err) {
      console.error('Error sending files:', err);
      setSendStatus('Failed to send files. Check console for details.');
      setTimeout(() => {
        setSendStatus('');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-6 sm:p-20">
      <div className="w-full flex justify-center items-center mb-12">
        <h1 className="text-4xl font-bold">CS Grader</h1>
      </div>
      
      <main className="w-full max-w-4xl mx-auto">
        {editors.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <button
              onClick={addNewEditor}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-2xl flex items-center justify-center transition-colors"
            >
              +
            </button>
            <p className="text-gray-600">Click to add code editor</p>
          </div>
        ) : (
          <div className="space-y-6">
            {editors.map((editor, index) => (
              <div key={editor.id}>
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleMinimize(editor.id)}
                        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                      >
                        {editor.isMinimized ? '▼' : '▲'}
                      </button>
                      <h2 className="text-xl font-semibold">Code Editor {index + 1}</h2>
                      <span className="text-sm text-gray-500">{editor.filename}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => saveCode(editor.code, editor.id)}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => removeEditor(editor.id)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {!editor.isMinimized && (
                    <div className="relative">
                      <div className="h-[300px] border rounded-lg overflow-hidden">
                        <Editor
                          height="100%"
                          defaultLanguage="python"
                          theme="vs-dark"
                          value={editor.code}
                          onChange={(value: string | undefined) => {
                            const newCode = value || "";
                            updateEditorCode(editor.id, newCode);
                          }}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                          }}
                        />
                      </div>
                      {saveStatus[editor.id] && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-gray-800 text-white rounded-md text-sm">
                          {saveStatus[editor.id]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {index === editors.length - 1 && (
                  <div className="flex justify-center mt-4 space-x-4">
                    <button
                      onClick={addNewEditor}
                      className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xl flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                    <button
                      onClick={sendAllFiles}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm transition-colors border-2 border-purple-600 active:bg-purple-700 active:border-purple-800"
                    >
                      Send All Files
                    </button>
                  </div>
                )}
              </div>
            ))}
            {sendStatus && (
              <div className="fixed bottom-4 right-4 px-4 py-2 bg-gray-800 text-white rounded-md text-sm shadow-lg">
                {sendStatus}
                <div className="text-xs text-gray-300 mt-1">
                  Press F12 to open console for details
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 