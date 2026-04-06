import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, system, history } = await req.json() as {
      prompt: string;
      system?: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    // Build the messages array safely
    const messages: { role: string; content: string }[] = [];
    if (system) messages.push({ role: 'system', content: system });
    if (history && Array.isArray(history)) {
      messages.push(...history.filter(h => h.content && h.role));
    }
    if (prompt) messages.push({ role: 'user', content: prompt });

    // Using the DIRECT Pollinations endpoint instead of the g4f proxy
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai', // Pollinations uses this default
        messages,
        temperature: 0.7,
      }),
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const errorText = await res.text();
      console.error("Provider returned HTML:", errorText.substring(0, 200));
      return NextResponse.json(
        { error: `API Provider Error (Status: ${res.status}). Try a shorter prompt.` }, 
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || `Error ${res.status}` }, { status: 500 });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ text });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
