import { NextRequest, NextResponse } from "next/server";

const DOCUSIGN_BASE_URL = "https://demo.docusign.net/restapi/v2.1";
const ACCESS_TOKEN_COOKIE = "access_token";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized: Missing access token" }, { status: 401 });
  }

  try {
    // Fetch accountId from userinfo
    const userInfoResponse = await fetch("https://account-d.docusign.com/oauth/userinfo", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error("Error fetching user info:", errorText);
      return NextResponse.json({ error: "Failed to fetch user info" }, { status: 400 });
    }

    const userInfo = await userInfoResponse.json();
    const accountId = userInfo.accounts[0]?.account_id;

    if (!accountId) {
      console.error("Account ID not found in user info");
      return NextResponse.json({ error: "Account ID not found" }, { status: 400 });
    }

    // Fetch envelopes
    const envelopesResponse = await fetch(
      `${DOCUSIGN_BASE_URL}/accounts/${accountId}/envelopes?from_date=2023-01-01T00:00:00Z`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!envelopesResponse.ok) {
      const errorText = await envelopesResponse.text();
      console.error("Error fetching envelopes:", errorText);
      return NextResponse.json({ error: "Failed to fetch envelopes" }, { status: 400 });
    }

    const envelopesData = await envelopesResponse.json();

    // Return envelope details (including envelopeId for frontend to link)
    return NextResponse.json({ envelopes: envelopesData.envelopes });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
