import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, system, history } = body as {
      prompt: string;
      system?: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    // 1. Clean and validate the messages array
    // Reverse proxies often crash if 'content' is empty or undefined
    const messages: { role: string; content: string }[] = [];

    if (system && system.trim()) {
      messages.push({ role: 'system', content: system });
    }

    if (history && Array.isArray(history)) {
      // Filter out any broken history objects
      const cleanHistory = history.filter(h => h.content && h.role);
      messages.push(...cleanHistory);
    }

    if (prompt && prompt.trim()) {
      messages.push({ role: 'user', content: prompt });
    } else {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 2. Prepare the payload
    const payload = {
      model: 'openai-large',
      messages,
      temperature: 0.7,
    };

    const res = await fetch('https://g4f.space/api/pollinations/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 3. CRITICAL FIX: Check if the response is actually JSON
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const textError = await res.text();
      console.error("External API returned HTML/Text instead of JSON:", textError.slice(0, 200));
      return NextResponse.json({ 
        error: `External API Error: Received ${res.status}. Your month of data might be exceeding the provider's character limit.` 
      }, { status: res.status });
    }

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || `API Error ${res.status}` }, { status: 500 });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ text });

  } catch (err: any) {
    console.error("Route Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
