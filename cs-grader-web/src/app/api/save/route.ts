import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { code, filename } = await request.json();
    
    // Define the path to the textfiles directory
    const savePath = path.join(process.cwd(), 'cs-grader-web', 'textfiles');
    
    // Create the directory if it doesn't exist
    await fs.mkdir(savePath, { recursive: true });
    
    // Save the file
    await fs.writeFile(path.join(savePath, filename), code);
    
    return NextResponse.json({ 
      success: true, 
      filename: filename 
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save file' },
      { status: 500 }
    );
  }
} 