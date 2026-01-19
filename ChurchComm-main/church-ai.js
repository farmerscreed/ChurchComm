import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Logic to search the brain
export async function askBrain(query) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const { embedding } = (await model.embedContent(query)).embedding;
  
  const { data } = await supabase.rpc('match_church_memories', {
    query_embedding: embedding,
    match_threshold: 0.4,
    match_count: 3
  });
  return data;
}

// Logic to save to the brain
export async function teachBrain(content, type = 'coding_note') {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const { embedding } = (await model.embedContent(content)).embedding;

  await supabase.from('church_memories').insert({
    content,
    metadata: { type, timestamp: new Date().toISOString() },
    embedding
  });
  console.log("✅ Brain updated.");
}
