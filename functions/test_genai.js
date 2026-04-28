const { GoogleGenAI } = require('@google/genai');
const { GoogleAuth } = require('google-auth-library');

async function test() {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    console.log("Fetching auth client...");
    const authClient = await auth.getClient();
    const token = await authClient.getAccessToken();
    console.log("Token retrieved successfully? " + !!token.token);
    
    console.log("Initializing GoogleGenAI...");
    const ai = new GoogleGenAI({ 
        vertexai: { project: 'development-317819', location: 'us-central1' },
        authClient: authClient
    });
    
    // Sometimes the library needs the actual credentials object or token
    // We will attempt standard first, and if not we can try injecting.
    console.log("Calling generateContent...");
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hello, what is Unreal Engine 5?',
        config: {
            systemInstruction: 'You are an expert.'
        }
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}

test();
