import { NextApiRequest } from "next";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function POST(req: NextApiRequest) {
  console.log("[INFO] Received request to /api/summary");

  let body;
  try {
    if (req.body instanceof ReadableStream) {
      body = await req.json();
    } else {
      body = req.body;
    }
  } catch (err) {
    console.error("[ERROR] Failed to parse request body:", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { envelopeId, type } = body;

  if (!envelopeId) {
    console.warn("[WARN] Missing envelopeId in request body");
    return NextResponse.json({ error: "EnvelopeId is required" }, { status: 400 });
  }

  console.log("[INFO] Envelope ID received:", envelopeId);

  try {
    console.log("[INFO] Fetching document markdown from Supabase");
    const { data, error } = await supabase
      .from("envelopes")
      .select("markdown")
      .eq("envelope_id", envelopeId)
      .single();

    if (error || !data) {
      console.error("[ERROR] Failed to fetch document markdown:", error);
      return NextResponse.json({ error: "Failed to retrieve document markdown" }, { status: 500 });
    }

    const markdown = data.markdown;

    if (!markdown) {
      console.warn("[WARN] No markdown found for the provided envelopeId");
      return NextResponse.json({ error: "No markdown available for the provided envelopeId" }, { status: 404 });
    }

    console.log("[INFO] Retrieved document markdown");

    // Chunk the markdown into manageable sizes
    const chunkSize = 12000000; // Token limit for gpt-3.5-turbo (approx. 4 characters per token)
    const chunks = [];
    for (let i = 0; i < markdown.length; i += chunkSize) {
      chunks.push(markdown.slice(i, i + chunkSize));
    }

    console.log(`[INFO] Document split into ${chunks.length} chunks`);

    const summaries = [];

    for (const chunk of chunks) {
      console.log("[INFO] Summarizing a chunk");

      // Adjust the system prompt based on the `type`
      const systemPrompt =
        type === "neurodivergent"
          ? `You are an assistant summarizing employment contracts in easy-read format for neurodivergent individuals. Use simple sentences, avoid jargon, and structure the summary in Markdown format as follows:
    
# Summary of Employment Contract

## Key Information
- **Job Title**: [Include job title]
- **Start Date**: [Include start date]
- **Salary**: [Include salary]
- **Work Hours**: [Include work hours]

## Benefits
- [Summarize key benefits]

## Termination
- [Summarize termination details]

Use short sentences and avoid complex language.`
          : type === "dyslexia"
            ? `You are an assistant summarizing employment contracts for individuals with dyslexia. Use clear and straightforward language, short paragraphs, and provide the summary in Markdown format as follows:

# Summary of Employment Contract

## Key Information
- **Job Title**: [Include job title]
- **Start Date**: [Include start date]
- **Salary**: [Include salary]
- **Work Hours**: [Include work hours]

## Benefits
- [Summarize key benefits]

## Termination
- [Summarize termination details]

Make the summary easy to read and understand. Use plain language and Markdown format.`
            : `You are an assistant summarizing employment contracts. Provide the summary in Markdown format structured as follows:

# Summary of Employment Contract

## Key Information
- **Job Title**: [Include job title]
- **Start Date**: [Include start date]
- **Salary**: [Include salary]
- **Work Hours**: [Include work hours]

## Benefits
- [Summarize key benefits]

## Termination
- [Summarize termination details]

Keep the summary concise, clear, and formatted in Markdown.`;



      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please summarize the following document:\n\n${chunk}` },
        ],
      });

      summaries.push(response.choices[0]?.message?.content || "");
    }

    const finalSummary = summaries.join("\n\n");

    console.log("[INFO] Sending summary response back to the client");
    return NextResponse.json({ summary: finalSummary }, { status: 200 });
  } catch (error) {
    console.error("[ERROR] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
