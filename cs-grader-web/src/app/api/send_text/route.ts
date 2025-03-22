import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Get the textfiles directory path
    const textfilesDir = path.join(process.cwd(), 'cs-grader-web', 'textfiles');
    
    // Read all files in the directory
    const files = await fs.readdir(textfilesDir);
    const textFiles = files.filter(file => file.endsWith('.txt'));

    if (textFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No text files found' },
        { status: 400 }
      );
    }

    // Create FormData and add files
    const formData = new FormData();
    
    // Read all files and add them to FormData
    for (const filename of textFiles) {
      const filePath = path.join(textfilesDir, filename);
      const fileContent = await fs.readFile(filePath);
      
      // Create a Blob from the file content
      const blob = new Blob([fileContent], { type: 'text/plain' });
      formData.append('files', blob, filename);
    }

    // Log what we're sending
    console.log('Sending files:', textFiles);

    // Send files to the FastAPI endpoint
    const response = await fetch('http://localhost:8000/api/v1/input/files-to-text', {
      method: 'POST',
      body: formData  // Send as FormData
    });

    if (!response.ok) {
      // Try to get the error message in different ways
      let errorMessage = 'Failed to send files';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || JSON.stringify(errorData);
      } catch (e) {
        // If we can't parse as JSON, get the text
        errorMessage = await response.text();
      }
      
      console.error('FastAPI Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage: errorMessage
      });
      
      throw new Error(`FastAPI Error (${response.status}): ${errorMessage}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Files sent successfully',
      files_sent: textFiles.length,
      result: result
    });

  } catch (error) {
    console.error('Error sending files:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send files',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 