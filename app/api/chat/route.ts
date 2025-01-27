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
  console.log("[INFO] Received request to /api/chat");

  let body;
  try {
    if (req.body instanceof ReadableStream) {
      // If running in an edge environment, parse the ReadableStream
      body = await req.json();
    } else {
      // Otherwise, assume the body is already parsed
      body = req.body;
    }
  } catch (err) {
    console.error("[ERROR] Failed to parse request body:", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { query, envelopeId, type } = body;

  console.log("[INFO] Body", body);


  if (!query || !envelopeId) {
    console.warn("[WARN] Missing query or envelopeId in request body", body);
    return NextResponse.json({ error: "Query and envelopeId are required" }, { status: 400 });
  }

  console.log("[INFO] Query received:", query);
  console.log("[INFO] Envelope ID received:", envelopeId);

  let systemPrompt = `You are an expert assistant helping a user review an employment contract. Your role is to:
- Answer questions using only the document context.
- Quote directly where possible, and include section numbers if mentioned.
- If the document doesn’t mention it, say: "The document does not provide this information."
- Avoid adding extra information not in the document.`;

  if (type.toLowerCase() === "dyslexia") {
    systemPrompt = `You are an expert assistant helping a user with dyslexia understand an employment contract. Your role is to:
- Use simple, clear, and short sentences.
- Avoid quoting unless absolutely necessary.
- Focus on explaining the meaning in an easy-to-read way.`;
  } else if (type.toLowerCase() === "neurodivergent") {
    systemPrompt = `You are an expert assistant helping a neurodivergent user understand an employment contract. Your role is to:
- Write in an "easy read" style with short sentences.
- Avoid quoting unless absolutely necessary.
- Use simple terms to make content easy to follow.`;
  }

  try {
    console.log("[INFO] Generating embedding for the query");
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    console.log("[INFO] Query embedding generated successfully");

    console.log("[INFO] Searching for relevant context in Supabase");
    const { data: matches, error } = await supabase.rpc("match_embeddings", {
      envelope_id: envelopeId, // Use the provided envelope ID
      query_embedding: queryEmbedding,
      similarity_threshold: 0.75,
      match_count: 5,
    });

    if (error) {
      console.error("[ERROR] Supabase RPC match_embeddings failed:", error);
      return NextResponse.json({ error: "Failed to find relevant context" }, { status: 500 });
    }

    console.log(`[INFO] Found ${matches.length} matches from Supabase`);

    const context = matches.map((match: any) => match.chunk).join("\n");
    console.log("[INFO] Compiled context for the query");

    console.log("[INFO] Sending query and context to OpenAI ChatGPT");
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: `Context: ${context}\n\nQuestion: ${query}` },
      ],
    });

    const answer = chatResponse.choices[0]?.message?.content || "No response available";
    console.log("[INFO] ChatGPT response received");

    console.log("[INFO] Sending response back to the client");
    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    console.error("[ERROR] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
