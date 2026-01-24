import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Setup Connections using Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Saves a chat interaction to the Supabase Vector "Memory" table.
 */
export async function saveChatToMemory(userText, aiResponse) {
  try {
    const fullContent = `User: ${userText}\nAI: ${aiResponse}`;
    
    // 2. Generate the "Brain Pattern" (Embedding)
    // We use Gemini's embedding model to turn text into a vector
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(fullContent);
    const embedding = result.embedding.values;

    // 3. Save to your Supabase Memory Table
    const { error } = await supabase
      .from('church_memories')
      .insert({
        content: fullContent,
        metadata: { 
          type: 'chat_history', 
          timestamp: new Date().toISOString(),
          app_version: '1.0.0'
        },
        embedding: embedding
      });

    if (error) {
      console.error('❌ Error saving to Supabase:', error.message);
    } else {
      console.log('✅ Memory successfully stored in the church brain!');
    }
  } catch (err) {
    console.error('❌ System Error:', err.message);
  }
}

// Example usage (You can delete this part once you import this function elsewhere):
saveChatToMemory(
  "How many people are in the Sunday youth group?",
  "There are currently 24 members registered."
);
