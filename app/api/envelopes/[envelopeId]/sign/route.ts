import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";

const DOCUSIGN_BASE_URL = "https://demo.docusign.net/restapi/v2.1";
const DOCUSIGN_AUTH_SERVER = "account-d.docusign.com";

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;

async function getJWTToken() {
  console.log('=== Starting JWT Token Generation ===');
  console.log('Integration Key:', INTEGRATION_KEY?.substring(0, 8) + '...');
  console.log('User ID:', USER_ID?.substring(0, 8) + '...');
  console.log('Private Key Length:', PRIVATE_KEY?.length);

  if (!PRIVATE_KEY) {
    console.error('Private key is missing!');
    throw new Error("Private key not configured");
  }

  const payload = {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: DOCUSIGN_AUTH_SERVER,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: "signature impersonation"
  };

  console.log('JWT Payload:', {
    ...payload,
    iat: new Date(payload.iat * 1000).toISOString(),
    exp: new Date(payload.exp * 1000).toISOString()
  });

  try {
    const token = jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
    console.log('JWT Token Generated:', token.substring(0, 50) + '...');

    // Exchange JWT for access token
    console.log('Exchanging JWT for access token...');
    const response = await fetch(`https://${DOCUSIGN_AUTH_SERVER}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': token
      })
    });

    const responseData = await response.json();
    console.log('OAuth Response Status:', response.status);
    console.log('OAuth Response Headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      console.error('OAuth Error Response:', responseData);
      throw new Error(`OAuth error: ${response.status} ${JSON.stringify(responseData)}`);
    }

    console.log('Access Token Generated:', responseData.access_token.substring(0, 20) + '...');
    return responseData.access_token;
  } catch (error) {
    console.error('Error in getJWTToken:', error);
    throw error;
  }
}

export async function GET(req: NextRequest, { params }: { params: { envelopeId: string } }) {
  console.log('=== Starting GET Request ===');
  console.log('Envelope ID:', params.envelopeId);
  const { envelopeId } = params;

  try {
    console.log('Getting JWT token...');
    const accessToken = await getJWTToken();

    if (!ACCOUNT_ID) {
      console.error('Account ID is missing!');
      return NextResponse.json({ error: "Account ID not configured" }, { status: 400 });
    }
    console.log('Using Account ID:', ACCOUNT_ID);

    // Step 2: Fetch recipient details
    console.log('Fetching recipient details...');
    const recipientsUrl = `${DOCUSIGN_BASE_URL}/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/recipients`;
    console.log('Recipients URL:', recipientsUrl);

    const recipientsResponse = await fetch(recipientsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Recipients Response Status:', recipientsResponse.status);
    console.log('Recipients Response Headers:', Object.fromEntries(recipientsResponse.headers));

    if (!recipientsResponse.ok) {
      const errorText = await recipientsResponse.text();
      console.error('Recipients Error Response:', errorText);
      throw new Error(`Failed to fetch recipients: ${recipientsResponse.status} ${errorText}`);
    }

    const recipientsData = await recipientsResponse.json();
    console.log('Recipients Data:', JSON.stringify(recipientsData, null, 2));

    const recipient = recipientsData.signers?.[0];
    if (!recipient) {
      console.error('No recipient found in response');
      throw new Error("No recipient found for this envelope");
    }
    console.log('Found Recipient:', {
      email: recipient.email,
      name: recipient.name,
      clientUserId: recipient.clientUserId
    });

    // Step 3: Generate signing URL
    console.log('Generating signing URL...');
    const signingUrl = `${DOCUSIGN_BASE_URL}/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/views/recipient`;
    console.log('Signing URL endpoint:', signingUrl);

    const signingBody = {
      returnUrl: `${process.env.BASE_URL}/dashboard`,
      authenticationMethod: "none",
      email: recipient.email,
      userName: recipient.name,
      clientUserId: recipient.clientUserId,
    };
    console.log('Signing Request Body:', signingBody);

    const signingResponse = await fetch(signingUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signingBody),
    });

    console.log('Signing Response Status:', signingResponse.status);
    console.log('Signing Response Headers:', Object.fromEntries(signingResponse.headers));

    if (!signingResponse.ok) {
      const errorText = await signingResponse.text();
      console.error('Signing Error Response:', errorText);
      return NextResponse.json({ error: "Failed to generate signing URL" }, { status: 400 });
    }

    const signingData = await signingResponse.json();
    console.log('Signing URL Generated:', signingData.url);

    return NextResponse.json({
      signingUrl: signingData.url
    });
  } catch (error) {
    console.error('Unexpected error in GET handler:', error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}