import {
  EmbeddingModelV1,
  LanguageModelV1,
  ProviderV1,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { G4FChatLanguageModel } from './G4F-chat-language-model';
import {
  G4FChatModelId,
  G4FChatSettings,
} from './G4F-chat-settings';
import { G4FEmbeddingModel } from './G4F-embedding-model';
import {
  G4FEmbeddingModelId,
  G4FEmbeddingSettings,
} from './G4F-embedding-settings';

export interface G4FProvider extends ProviderV1 {
  (
    modelId: G4FChatModelId,
    settings?: G4FChatSettings,
  ): LanguageModelV1;

  /**
Creates a model for text generation.
*/
  languageModel(
    modelId: G4FChatModelId,
    settings?: G4FChatSettings,
  ): LanguageModelV1;

  /**
Creates a model for text generation.
*/
  chat(
    modelId: G4FChatModelId,
    settings?: G4FChatSettings,
  ): LanguageModelV1;

  /**
@deprecated Use `textEmbeddingModel()` instead.
   */
  embedding(
    modelId: G4FEmbeddingModelId,
    settings?: G4FEmbeddingSettings,
  ): EmbeddingModelV1<string>;

  /**
@deprecated Use `textEmbeddingModel()` instead.
   */
  textEmbedding(
    modelId: G4FEmbeddingModelId,
    settings?: G4FEmbeddingSettings,
  ): EmbeddingModelV1<string>;

  textEmbeddingModel: (
    modelId: G4FEmbeddingModelId,
    settings?: G4FEmbeddingSettings,
  ) => EmbeddingModelV1<string>;
}

export interface G4FProviderSettings {
  /**
Use a different URL prefix for API calls, e.g. to use proxy servers.
The default prefix is `https://api.G4F.ai/v1`.
   */
  baseURL?: string;

  /**
API key that is being send using the `Authorization` header.
It defaults to the `G4F_API_KEY` environment variable.
   */
  apiKey?: string;

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>;

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: FetchFunction;
}

/**
Create a G4F AI provider instance.
 */
export function createG4F(
  options: G4FProviderSettings = {},
): G4FProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL) ?? 'https://api.G4F.ai/v1';

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'G4F_API_KEY',
      description: 'G4F',
    })}`,
    ...options.headers,
  });

  const createChatModel = (
    modelId: G4FChatModelId,
    settings: G4FChatSettings = {},
  ) =>
    new G4FChatLanguageModel(modelId, settings, {
      provider: 'G4F.chat',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createEmbeddingModel = (
    modelId: G4FEmbeddingModelId,
    settings: G4FEmbeddingSettings = {},
  ) =>
    new G4FEmbeddingModel(modelId, settings, {
      provider: 'G4F.embedding',
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const provider = function (
    modelId: G4FChatModelId,
    settings?: G4FChatSettings,
  ) {
    if (new.target) {
      throw new Error(
        'The G4F model function cannot be called with the new keyword.',
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;

  return provider as G4FProvider;
}

/**
Default G4F provider instance.
 */
export const G4F = createG4F();
