import { NextRequest, NextResponse } from "next/server";

const DOCUSIGN_BASE_URL = "https://demo.docusign.net/restapi/v2.1";
const ACCESS_TOKEN_COOKIE = "access_token";

export async function GET(req: NextRequest, { params }: { params: { envelopeId: string } }) {
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const { envelopeId } = params;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized: Missing access token" }, { status: 401 });
  }

  try {
    // Step 1: Fetch accountId from userinfo
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
      return NextResponse.json({ error: "Account ID not found" }, { status: 400 });
    }

    // Step 2: Fetch recipient details
    const recipientsResponse = await fetch(
      `${DOCUSIGN_BASE_URL}/accounts/${accountId}/envelopes/${envelopeId}/recipients`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!recipientsResponse.ok) {
      throw new Error("Failed to fetch recipients");
    }

    const recipientsData = await recipientsResponse.json();
    const recipient = recipientsData.signers?.[0];

    if (!recipient) {
      throw new Error("No recipient found for this envelope");
    }

    // Step 3: Generate signing URL
    const signingResponse = await fetch(
      `${DOCUSIGN_BASE_URL}/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: `${process.env.BASE_URL}/dashboard`,
          authenticationMethod: "none",
          email: recipient.email,
          userName: recipient.name,
          clientUserId: recipient.clientUserId,
        }),
      }
    );

    if (!signingResponse.ok) {
      const errorText = await signingResponse.text();
      console.error("Error generating signing URL:", errorText);
      return NextResponse.json({ error: "Failed to generate signing URL" }, { status: 400 });
    }

    const signingData = await signingResponse.json();

    // Step 4: Return app-specific URL
    return NextResponse.json({
      signingUrl:
        signingData.url
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
