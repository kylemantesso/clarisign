import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant simplifying text using easy-read guidelines for neurodivergent users. Rewrite the provided text in short, clear sentences. Format using markdown and dot points',
        },
        { role: 'user', content: text },
      ],
    });

    const transformedText = response.choices[0]?.message?.content || 'Unable to transform text.';
    return NextResponse.json({ transformedText }, { status: 200 });
  } catch (error) {
    console.error('Error transforming text:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
