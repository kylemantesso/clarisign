import { NextRequest, NextResponse } from "next/server";

const TOKEN_ENDPOINT = "https://account-d.docusign.com/oauth/token";
const CLIENT_ID = process.env.DOCUSIGN_CLIENT_ID!;
const CLIENT_SECRET = process.env.DOCUSIGN_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DOCUSIGN_REDIRECT_URI!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
    }

    const { access_token, refresh_token, expires_in } = await response.json();

    // Store the tokens in cookies (for demonstration)
    const responseCookies = new NextResponse(null, {
      status: 302,
      headers: {
        Location: "/dashboard", // Redirect to your app's dashboard
      },
    });

    responseCookies.cookies.set("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expires_in,
      path: "/",
    });

    responseCookies.cookies.set("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return responseCookies;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json({ error: "Failed to exchange authorization code for token" }, { status: 500 });
  }
}
