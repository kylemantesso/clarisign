import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";

const DOCUSIGN_BASE_URL = "https://demo.docusign.net/restapi/v2.1";
const DOCUSIGN_AUTH_SERVER = "account-d.docusign.com";

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;

function formatPrivateKey(privateKey: string): string {
  console.log('=== Private Key Formatting Debug ===');
  console.log('1. Original key length:', privateKey?.length);
  console.log('2. Original key first 50 chars:', privateKey?.substring(0, 50));

  // First, clean up the key by removing all whitespace and existing headers/footers
  let cleanKey = privateKey
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '')
    .replace(/[\n\r\s]/g, '');

  console.log('3. Cleaned key length:', cleanKey.length);
  console.log('4. Cleaned key first 50 chars:', cleanKey.substring(0, 50));

  // Split the key into 64-character chunks
  const chunks = cleanKey.match(/.{1,64}/g) || [];
  console.log('5. Number of 64-char chunks:', chunks.length);

  // Reassemble the key with proper formatting
  const formattedKey = [
    '-----BEGIN RSA PRIVATE KEY-----',
    ...chunks,
    '-----END RSA PRIVATE KEY-----'
  ].join('\n');

  console.log('6. Final key structure:');
  formattedKey.split('\n').forEach((line, i) => {
    console.log(`Line ${i + 1}: ${line.substring(0, 10)}...`);
  });

  return formattedKey;
}

async function getJWTToken() {
  console.log('\n=== Starting JWT Token Generation ===');
  console.log('Environment Variables Check:');
  console.log('- Integration Key present:', !!INTEGRATION_KEY);
  console.log('- User ID present:', !!USER_ID);
  console.log('- Private Key present:', !!PRIVATE_KEY);
  console.log('- Account ID present:', !!ACCOUNT_ID);

  if (!PRIVATE_KEY) {
    console.error('Private key is missing!');
    throw new Error("Private key not configured");
  }

  try {
    const formattedKey = formatPrivateKey(PRIVATE_KEY);

    const payload = {
      iss: INTEGRATION_KEY,
      sub: USER_ID,
      aud: DOCUSIGN_AUTH_SERVER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: "signature impersonation"
    };

    console.log('\n=== JWT Signing Attempt ===');
    console.log('Payload:', {
      ...payload,
      iat: new Date(payload.iat * 1000).toISOString(),
      exp: new Date(payload.exp * 1000).toISOString()
    });

    const token = jwt.sign(payload, formattedKey, {
      algorithm: 'RS256'
    });

    console.log('JWT Token successfully generated. First 50 chars:', token.substring(0, 50));

    console.log('\n=== Starting OAuth Token Exchange ===');
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

    return responseData.access_token;
  } catch (error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
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