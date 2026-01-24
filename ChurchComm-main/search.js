import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Setup Connections
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Searches the church_memories table for relevant context.
 */
async function searchMemories(queryText) {
  try {
    console.log(`🔍 Searching "Church Brain" for: "${queryText}"...`);

    // 2. Generate an embedding (768 dimensions for Gemini)
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(queryText);
    const queryEmbedding = result.embedding.values; 

    // 3. Call the Supabase function
    const { data: matches, error } = await supabase.rpc('match_church_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, 
      match_count: 5        
    });

    if (error) throw error;

    if (!matches || matches.length === 0) {
      console.log("Empty-handed! No similar memories found.");
    } else {
      console.log(`✅ Found ${matches.length} relevant memories:\n`);
      matches.forEach((m, i) => {
        console.log(`[Result #${i + 1}] Similarity: ${(m.similarity * 100).toFixed(1)}%`);
        console.log(`Content: ${m.content}`);
        console.log(`------------------------------------\n`);
      });
    }
  } catch (err) {
    console.error('❌ Search Error:', err.message);
  }
}

// Example test: change this to whatever you want to look up
searchMemories("youth group members");
