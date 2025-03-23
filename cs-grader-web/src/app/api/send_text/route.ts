import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Create a new FormData to send to FastAPI
    const fastApiFormData = new FormData();
    
    // Add each file to the FormData
    for (const file of files) {
      if (file instanceof File) {
        fastApiFormData.append('files', file);
      }
    }

    // Log what we're sending
    console.log('Sending files:', files.map((f: FormDataEntryValue) => f instanceof File ? f.name : String(f)));

    // Send files to the FastAPI endpoint
    const response = await fetch('http://localhost:8000/api/v1/input/files-to-text', {
      method: 'POST',
      body: fastApiFormData
    });

    if (!response.ok) {
      // Try to get the error message in different ways
      let errorMessage = 'Failed to send files';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || JSON.stringify(errorData);
      } catch {
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
      files_sent: files.length,
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