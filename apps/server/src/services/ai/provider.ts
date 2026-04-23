import OpenAI from 'openai';
import { ProxyAgent } from 'undici';

let cachedClient: OpenAI | null = null;

function getProxyUrl() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    undefined
  );
}

export function getOpenAIClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  const proxyUrl = getProxyUrl();

  cachedClient = new OpenAI({
    apiKey,
    baseURL,
    fetchOptions: proxyUrl
      ? {
          dispatcher: new ProxyAgent(proxyUrl)
        }
      : undefined
  });

  return cachedClient;
}
