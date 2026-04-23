export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function getOpenAIStore() {
  const raw = process.env.OPENAI_STORE?.trim().toLowerCase();

  if (!raw) {
    return undefined;
  }

  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  return undefined;
}

export function getOpenAIStatelessMode() {
  const raw = process.env.OPENAI_STATELESS_MODE?.trim().toLowerCase();

  return raw === '1' || raw === 'true';
}
