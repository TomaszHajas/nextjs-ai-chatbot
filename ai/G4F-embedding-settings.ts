export type G4FEmbeddingModelId = 'G4F-embed' | (string & {});

export interface G4FEmbeddingSettings {
  /**
Override the maximum number of embeddings per call.
   */
  maxEmbeddingsPerCall?: number;

  /**
Override the parallelism of embedding calls.
    */
  supportsParallelCalls?: boolean;
}
