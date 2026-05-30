import { Model, ProviderId } from '../types';

export function getOptimalModel(
  userQuery: string,
  constraint: 'free' | 'any',
  models: Model[]
): { id: string; provider: ProviderId } {
  const query = userQuery.toLowerCase();
  
  // Heuristic categories
  const isCodingOrTech = /\b(code|function|class|react|typescript|javascript|html|css|python|api|json|sql|database|bug|error|git|compile|regex|loop|interface|method|array|reconstruct|implementation|algorithm|solve)\b/i.test(query);
  const isDeepReasoning = /\b(solve|math|calculate|derive|prove|scientific|logic|philosophical|explain in detail|analysis|assess|compare|contrast|why is|how does|step-by-step|reasoning)\b/i.test(query);

  const pool = models && models.length > 0 ? models : [];

  // Filter model pool according to restriction
  const eligibleModels = constraint === 'free' ? pool.filter(m => m.isFree) : pool;

  if (eligibleModels.length === 0) {
    if (pool.length > 0) {
      return { id: pool[0].id, provider: pool[0].provider };
    }
    // Fail-safe fallbacks if parent pool is still fetching
    return { id: 'google/gemma-4-31b-it:free', provider: 'openrouter' };
  }

  // Helper matching functions
  const findModelInPool = (keywords: string[]) => {
    for (const kw of keywords) {
      const match = eligibleModels.find(m => m.id.toLowerCase().includes(kw));
      if (match) return match;
    }
    return null;
  };

  // Routing Selection Hierarchy
  if (isCodingOrTech) {
    // Excellent technical models
    const codeChoice = findModelInPool(['gpt-oss', 'gemma', 'llama-3.1', 'llama-3.3', 'lfm']);
    if (codeChoice) return { id: codeChoice.id, provider: codeChoice.provider };
  }

  if (isDeepReasoning) {
    // Elite reasoning/philosophical models
    const reasoningChoice = findModelInPool(['gpt-oss', 'llama-3.3', 'gemma', 'nemotron-3']);
    if (reasoningChoice) return { id: reasoningChoice.id, provider: reasoningChoice.provider };
  }

  // Fast lightweight default general-purpose model
  const generalChoice = findModelInPool(['gpt-oss', 'gemma', 'llama-3.1', 'nemotron-nano', 'lfm'])
    || eligibleModels.find(m => m.isFree)
    || eligibleModels[0];

  return { id: generalChoice.id, provider: generalChoice.provider };
}
