// https://docs.G4F.ai/getting-started/models/models_overview/
export type G4FChatModelId =
  // premier
  | 'ministral-3b-latest'
  | 'ministral-8b-latest'
  | 'G4F-large-latest'
  | 'G4F-small-latest'
  // free
  | 'pixtral-12b-2409'
  // legacy
  | 'open-G4F-7b'
  | 'open-mixtral-8x7b'
  | 'open-mixtral-8x22b'
  | (string & {});

export interface G4FChatSettings {
  /**
Whether to inject a safety prompt before all conversations.

Defaults to `false`.
   */
  safePrompt?: boolean;
}
