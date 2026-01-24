import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function smartChat(userQuery) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // --- STEP 1: SEARCH MEMORY ---
    const embeddingRes = await embedModel.embedContent(userQuery);
    const queryEmbedding = embeddingRes.embedding.values;

    const { data: memories } = await supabase.rpc('match_church_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 3
    });

    // Format memories into a string for the AI
    const context = memories?.map(m => m.content).join("\n") || "No previous memories found.";

    // --- STEP 2: ASK THE AI WITH CONTEXT ---
    const prompt = `
      You are a helpful Church Assistant. Use the following past memories to answer the user.
      
      Past Memories:
      ${context}

      User Question: ${userQuery}
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    console.log(`\n🤖 AI: ${aiResponse}`);

    // --- STEP 3: SAVE THE NEW INTERACTION ---
    const newContent = `User: ${userQuery}\nAI: ${aiResponse}`;
    const saveEmbeddingRes = await embedModel.embedContent(newContent);
    
    await supabase.from('church_memories').insert({
      content: newContent,
      metadata: { type: 'smart_chat', timestamp: new Date().toISOString() },
      embedding: saveEmbeddingRes.embedding.values
    });

    console.log("\n✅ Interaction saved to memory.");

  } catch (err) {
    console.error('❌ Chat Error:', err.message);
  }
}

// Example: Try asking about something you saved earlier!
smartChat("Tell me about the youth group.");
