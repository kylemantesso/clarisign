import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import {OpenAI} from "openai";


const DOCUSIGN_BASE_URL = "https://demo.docusign.net/restapi/v2.1";
const DATALAB_API_URL = "https://www.datalab.to/api/v1/marker";
const DATALAB_API_KEY = process.env.DATALAB_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ACCESS_TOKEN_COOKIE = "access_token";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  console.log("[INFO] Received request to create an envelope with Markdown extraction");

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    console.error("[ERROR] Missing access token");
    return NextResponse.json({ error: "Unauthorized: Missing access token" }, { status: 401 });
  }

  try {
    console.log("[INFO] Fetching account ID from DocuSign userinfo API");
    const userInfoResponse = await fetch("https://account-d.docusign.com/oauth/userinfo", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error("[ERROR] Failed to fetch user info:", errorText);
      return NextResponse.json({ error: "Failed to fetch user info" }, { status: 400 });
    }

    const userInfo = await userInfoResponse.json();
    const accountId = userInfo.accounts[0]?.account_id;

    if (!accountId) {
      console.error("[ERROR] Account ID not found in user info");
      return NextResponse.json({ error: "Account ID not found" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const recipientEmail = formData.get("recipientEmail") as string;
    const recipientName = formData.get("recipientName") as string;

    if (!file || !recipientEmail || !recipientName) {
      console.error("[ERROR] Missing required form data");
      return NextResponse.json({ error: "Missing required form data" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`[INFO] Received file: ${file.name}, size: ${fileBuffer.length} bytes`);

    const envelopeId = uuidv4();

    console.log("[INFO] Uploading file to DataLab for Markdown extraction");
    const dataLabFormData = new FormData();
    dataLabFormData.append("file", new Blob([fileBuffer], { type: "application/pdf" }), file.name);
    dataLabFormData.append("output_format", "markdown");

    const dataLabResponse = await fetch(DATALAB_API_URL, {
      method: "POST",
      headers: { "X-Api-Key": DATALAB_API_KEY },
      body: dataLabFormData,
    });

    if (!dataLabResponse.ok) {
      const errorText = await dataLabResponse.text();
      console.error("[ERROR] Failed to upload file to DataLab:", errorText);
      return NextResponse.json({ error: "Failed to upload to DataLab" }, { status: 400 });
    }

    const dataLabData = await dataLabResponse.json();
    const checkUrl = dataLabData.request_check_url;

    console.log("[INFO] Polling for Markdown result from DataLab");
    let markdown = null;
    for (let i = 0; i < 300; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const pollResponse = await fetch(checkUrl, {
        method: "GET",
        headers: { "X-Api-Key": DATALAB_API_KEY },
      });
      const pollData = await pollResponse.json();
      if (pollData.status === "complete") {
        markdown = pollData.markdown;
        console.log("[INFO] Markdown extraction complete");
        break;
      }
      if (pollData.status === "error") {
        throw new Error(`DataLab Error: ${pollData.error}`);
      }
    }

    if (!markdown) {
      console.error("[ERROR] Markdown polling timed out");
      return NextResponse.json({ error: "Markdown polling timed out" }, { status: 400 });
    }

    console.log("[INFO] Creating DocuSign envelope");
    const envelopeResponse = await fetch(`${DOCUSIGN_BASE_URL}/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailSubject: "Please sign this document",
        documents: [
          {
            documentBase64: fileBuffer.toString("base64"),
            name: file.name,
            fileExtension: "pdf",
            documentId: "1",
          },
        ],
        recipients: {
          signers: [
            {
              email: recipientEmail,
              name: recipientName,
              recipientId: "1",
              clientUserId: envelopeId,
            },
          ],
        },
        status: "sent",
      }),
    });

    if (!envelopeResponse.ok) {
      const errorText = await envelopeResponse.text();
      console.error("[ERROR] Failed to create envelope:", errorText);
      return NextResponse.json({ error: "Failed to create envelope" }, { status: 400 });
    }

    const envelopeData = await envelopeResponse.json();

    console.log("[INFO] Storing envelope metadata in Supabase");
    const { data, error } = await supabase.from("envelopes").insert([
      {
        envelope_id: envelopeData.envelopeId,
        markdown,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
      },
    ]);

    if (error) {
      console.error("[ERROR] Failed to store envelope metadata in Supabase:", error.message);
      return NextResponse.json({ error: "Failed to store envelope metadata in database" }, { status: 500 });
    }

    console.log("[INFO] Envelope data successfully stored in Supabase:", data);

    console.log("[INFO] Splitting Markdown into chunks for embedding");
    const chunks = markdown.match(/[\s\S]{1,2000}/g) || []; // Split Markdown into chunks of ~2000 characters

    console.log("[INFO] Generating embeddings for Markdown chunks");
    for (const chunk of chunks) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: chunk,
        });

        // Extract the numerical vector from the embedding
        const embeddingVector = embeddingResponse.data[0].embedding;

        console.log("[INFO] Storing embedding in Supabase");
        const { error } = await supabase.from("envelope_embeddings").insert({
          envelope_id: envelopeData.envelopeId, // Link to the envelope ID
          embedding: embeddingVector, // Store only the embedding vector
          chunk, // Store the corresponding chunk of text
        });

        if (error) {
          console.error("[ERROR] Failed to store embedding in Supabase:", error.message);
          return NextResponse.json({ error: "Failed to store embedding in database" }, { status: 500 });
        }
      } catch (embeddingError) {
        console.error("[ERROR] Failed to generate or store embedding:", embeddingError.message);
        return NextResponse.json({ error: "Failed to generate or store embedding" }, { status: 500 });
      }
    }

    console.log("[INFO] Embeddings successfully stored in Supabase");

    return NextResponse.json({
      envelopeId: envelopeData.envelopeId,
      markdown,
      message: "Envelope created and embeddings stored successfully",
    });
  } catch (error) {
    console.error("[ERROR] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
