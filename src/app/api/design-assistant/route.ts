import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { auth } from '@clerk/nextjs/server';

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const query = searchParams.get('query') || '';
    const type = searchParams.get('type') || 'system'; // 'system' | 'color' | 'typography' | 'style' | 'ux'

    if (!query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Sanitize query to prevent command injection
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();

    // Determine target script path (located in .agent/skills/ui-ux-pro-max/scripts/search.py)
    // The working directory for command runs is root, so relative path is fine.
    const scriptPath = path.join('.agent', 'skills', 'ui-ux-pro-max', 'scripts', 'search.py');

    let command = '';
    if (type === 'system') {
      command = `python "${scriptPath}" "${sanitizedQuery}" --design-system -f markdown`;
    } else {
      command = `python "${scriptPath}" "${sanitizedQuery}" -d ${type} --json`;
    }

    console.log(`[Design Assistant] Executing command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);

      if (type === 'system') {
        return NextResponse.json({ success: true, format: 'markdown', data: stdout });
      } else {
        try {
          const jsonData = JSON.parse(stdout);
          return NextResponse.json({ success: true, format: 'json', data: jsonData });
        } catch {
          // If JSON parse fails, return as raw string
          return NextResponse.json({ success: true, format: 'text', data: stdout });
        }
      }
    } catch (execError: any) {
      console.error('[Design Assistant Exec Error]:', execError);
      
      // Fallback to python3 if python is not in PATH (some Windows environments have only python3 mapped)
      try {
        let fallbackCommand = '';
        if (type === 'system') {
          fallbackCommand = `python3 "${scriptPath}" "${sanitizedQuery}" --design-system -f markdown`;
        } else {
          fallbackCommand = `python3 "${scriptPath}" "${sanitizedQuery}" -d ${type} --json`;
        }
        
        console.log(`[Design Assistant] Retrying with python3: ${fallbackCommand}`);
        const { stdout } = await execAsync(fallbackCommand);
        
        if (type === 'system') {
          return NextResponse.json({ success: true, format: 'markdown', data: stdout });
        } else {
          const jsonData = JSON.parse(stdout);
          return NextResponse.json({ success: true, format: 'json', data: jsonData });
        }
      } catch (fallbackError: any) {
        console.error('[Design Assistant Fallback Exec Error]:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to run UI/UX Pro Max search engine. Check script paths and Python configuration.' },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error('[Design Assistant API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
