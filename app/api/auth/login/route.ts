import { NextRequest, NextResponse } from "next/server";

const DOCUSIGN_AUTH_BASE_URL = "https://account-d.docusign.com/oauth/auth";
const CLIENT_ID = process.env.DOCUSIGN_CLIENT_ID!;
const REDIRECT_URI = process.env.DOCUSIGN_REDIRECT_URI!;
const SCOPES = "signature";

export async function GET(req: NextRequest) {
  const authUrl = `${DOCUSIGN_AUTH_BASE_URL}?response_type=code&scope=${SCOPES}&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;

  return NextResponse.redirect(authUrl);
}
