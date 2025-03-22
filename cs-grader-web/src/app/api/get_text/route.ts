import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Get the filename from the request body
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'No filename provided' },
        { status: 400 }
      );
    }

    // Get the file path
    const filePath = path.join(process.cwd(), 'cs-grader-web', 'textfiles', filename);

    try {
      // Read the file content
      const content = await fs.readFile(filePath, 'utf-8');
      
      return NextResponse.json({
        success: true,
        content: content
      });
    } 
    catch (err) {
      console.error('Error reading file:', err);
      return NextResponse.json(
        { success: false, error: 'File not found or could not be read' },
        { status: 404 }
      );
    }

  } 
  catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 