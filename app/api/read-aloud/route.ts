import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const config = {
  maxDuration: 300, // Tell Vercel to allow up to 60 seconds for processing
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Generate speech audio from the text
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });

    // Convert the response to an ArrayBuffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Return the audio as a stream
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[ERROR] Failed to generate speech audio:', error);
    return NextResponse.json({ error: 'Failed to generate speech audio' }, { status: 500 });
  }
}

