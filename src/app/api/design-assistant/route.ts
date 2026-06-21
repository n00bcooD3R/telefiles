import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'edge';

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

    // Attempt to load child_process dynamically (Node.js local runtime only)
    let execAsync: any = null;
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      execAsync = promisify(exec);
    } catch (e) {
      // child_process not available on edge/Cloudflare Page runtime
    }

    if (!execAsync) {
      // Return a helpful markdown fallback explanation on Cloudflare Pages edge runtime
      return NextResponse.json({
        success: true,
        format: 'markdown',
        data: `### AI Design Assistant (Edge Mode)

The UI/UX Pro Max search engine runs on a local Python database parser. 
In the serverless Cloudflare Pages environment, command-line Python execution is not supported.

**To use the AI Design Assistant:**
1. Run **privfiles** locally:
   \`\`\`bash
   npm run dev
   \`\`\`
2. Open the Design Assistant tab on your local dashboard at [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
3. Search, view, and copy premium color swatches, typography guidelines, and layout tokens directly into your project!
`
      });
    }

    // Sanitize query to prevent command injection
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();

    // Determine target script path (located in .agent/skills/ui-ux-pro-max/scripts/search.py)
    const scriptPath = '.agent/skills/ui-ux-pro-max/scripts/search.py';

    let command = '';
    if (type === 'system') {
      command = `python "${scriptPath}" "${sanitizedQuery}" --design-system -f markdown`;
    } else {
      command = `python "${scriptPath}" "${sanitizedQuery}" -d ${type} --json`;
    }

    console.log(`[Design Assistant] Executing command: ${command}`);

    try {
      const { stdout } = await execAsync(command);

      if (type === 'system') {
        return NextResponse.json({ success: true, format: 'markdown', data: stdout });
      } else {
        try {
          const jsonData = JSON.parse(stdout);
          return NextResponse.json({ success: true, format: 'json', data: jsonData });
        } catch {
          return NextResponse.json({ success: true, format: 'text', data: stdout });
        }
      }
    } catch (execError: any) {
      console.error('[Design Assistant Exec Error]:', execError);
      
      // Fallback to python3 if python is not in PATH (some systems map python3 exclusively)
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
