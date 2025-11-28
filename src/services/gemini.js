export const generateContent = async (effectiveKey, systemPrompt, userPrompt, setStatus, temperature = 0.2, model = 'gemini-1.5-flash') => {
    // Note: If effectiveKey is "", the platform runtime will inject the correct key.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }],
        generationConfig: {
            temperature: temperature,
            maxOutputTokens: 8192
        }
    };

    let retries = 0;
    const maxRetries = 2;
    const backoffDelays = [2000, 5000];

    while (retries <= maxRetries) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];
            const textResponse = candidate?.content?.parts?.[0]?.text;
            const finishReason = candidate?.finishReason;

            if (!textResponse && finishReason !== 'STOP') {
                throw new Error(finishReason || 'No content generated');
            }

            return textResponse || "";

        } catch (error) {
            console.error(`Attempt ${retries + 1} failed:`, error);
            if (retries === maxRetries) throw error;
            setStatus(`Retrying... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelays[retries]));
            retries++;
        }
    }
};
