import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    
    // Define the path to the textfiles directory
    const filePath = path.join(process.cwd(), 'cs-grader-web', 'textfiles', filename);
    
    // Delete the file
    await fs.unlink(filePath);
    
    return NextResponse.json({ 
      success: true,
      message: `File ${filename} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 