import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, system, history } = await req.json() as {
      prompt: string;
      system?: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    // Build full message array: system → history → new user message
    const messages: { role: string; content: string }[] = [];

    if (system) {
      messages.push({ role: 'system', content: system });
    }

    if (history && history.length > 0) {
      messages.push(...history);
    }

    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://g4f.space/api/pollinations/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai-large',
        messages,
        temperature: 0.7,
      }),
    });

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