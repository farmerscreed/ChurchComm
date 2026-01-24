/**
 * Shared utility for generating OpenAI embeddings
 * Used by vapi-webhook and generate-embedding functions
 */

export async function createEmbedding(text: string): Promise<number[]> {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
        throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "text-embedding-3-small",
            input: text,
            dimensions: 768,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embeddings API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

/**
 * Create embedding with 1536 dimensions (for church_memories compatibility)
 */
export async function createEmbedding1536(text: string): Promise<number[]> {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
        throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "text-embedding-3-small",
            input: text,
            dimensions: 1536,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embeddings API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}
