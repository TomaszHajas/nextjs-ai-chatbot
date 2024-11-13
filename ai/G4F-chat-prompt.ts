export type G4FPrompt = Array<G4FMessage>;

export type G4FMessage =
  | G4FSystemMessage
  | G4FUserMessage
  | G4FAssistantMessage
  | G4FToolMessage;

export interface G4FSystemMessage {
  role: 'system';
  content: string;
}

export interface G4FUserMessage {
  role: 'user';
  content: Array<G4FUserMessageContent>;
}

export type G4FUserMessageContent =
  | G4FUserMessageTextContent
  | G4FUserMessageImageContent;

export interface G4FUserMessageImageContent {
  type: 'image_url';
  image_url: string;
}

export interface G4FUserMessageTextContent {
  type: 'text';
  text: string;
}

export interface G4FAssistantMessage {
  role: 'assistant';
  content: string;
  prefix?: boolean;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface G4FToolMessage {
  role: 'tool';
  name: string;
  content: string;
  tool_call_id: string;
}
