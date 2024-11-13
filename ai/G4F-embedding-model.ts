import {
  EmbeddingModelV1,
  TooManyEmbeddingValuesForCallError,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createJsonResponseHandler,
  FetchFunction,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import {
  G4FEmbeddingModelId,
  G4FEmbeddingSettings,
} from './G4F-embedding-settings';
import { G4FFailedResponseHandler } from './G4F-error';

type G4FEmbeddingConfig = {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
};

export class G4FEmbeddingModel implements EmbeddingModelV1<string> {
  readonly specificationVersion = 'v1';
  readonly modelId: G4FEmbeddingModelId;

  private readonly config: G4FEmbeddingConfig;
  private readonly settings: G4FEmbeddingSettings;

  get provider(): string {
    return this.config.provider;
  }

  get maxEmbeddingsPerCall(): number {
    return this.settings.maxEmbeddingsPerCall ?? 32;
  }

  get supportsParallelCalls(): boolean {
    // Parallel calls are technically possible,
    // but I have been hitting rate limits and disable them for now.
    return this.settings.supportsParallelCalls ?? false;
  }

  constructor(
    modelId: G4FEmbeddingModelId,
    settings: G4FEmbeddingSettings,
    config: G4FEmbeddingConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  async doEmbed({
    values,
    abortSignal,
    headers,
  }: Parameters<EmbeddingModelV1<string>['doEmbed']>[0]): Promise<
    Awaited<ReturnType<EmbeddingModelV1<string>['doEmbed']>>
  > {
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new TooManyEmbeddingValuesForCallError({
        provider: this.provider,
        modelId: this.modelId,
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        values,
      });
    }

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/embeddings`,
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        model: this.modelId,
        input: values,
        encoding_format: 'float',
      },
      failedResponseHandler: G4FFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        G4FTextEmbeddingResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    return {
      embeddings: response.data.map(item => item.embedding),
      usage: response.usage
        ? { tokens: response.usage.prompt_tokens }
        : undefined,
      rawResponse: { headers: responseHeaders },
    };
  }
}

// minimal version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const G4FTextEmbeddingResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })),
  usage: z.object({ prompt_tokens: z.number() }).nullish(),
});
