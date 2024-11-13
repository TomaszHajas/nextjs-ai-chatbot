import {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  LanguageModelV1FinishReason,
  LanguageModelV1StreamPart,
} from '@ai-sdk/provider';
import {
  FetchFunction,
  ParseResult,
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';

export class G4FLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly defaultObjectGenerationMode = 'json';
  readonly provider = 'G4F';
  readonly supportsImageUrls = false;

  readonly modelId: MistralChatModelId;
  readonly settings: MistralChatSettings;

  constructor(
    modelId: MistralChatModelId,
    settings: MistralChatSettings,
    config: MistralChatConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

async doGenerate(
    options: Parameters<LanguageModelV1['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { args, warnings } = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: mistralFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        mistralChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];
    let text = choice.message.content ?? undefined;

    // when there is a trailing assistant message, mistral will send the
    // content of that message again. we skip this repeated content to
    // avoid duplication, e.g. in continuation mode.
    const lastMessage = rawPrompt[rawPrompt.length - 1];
    if (
      lastMessage.role === 'assistant' &&
      text?.startsWith(lastMessage.content)
    ) {
      text = text.slice(lastMessage.content.length);
    }


    //TODO
    const { G4F } = require("g4f");
    const g4f = new G4F();
    const messages = [
        { role: "user", content: "Hi, what's up?"}
    ];
    const options = {
        provider: g4f.providers.GPT,
        model: "gpt-3.5-turbo",
        debug: true,
        proxy: ""
    };
    
    (async() => {
    	const text = await g4f.chatCompletion(messages, options);	
    	console.log(text);
    })();

    return {
      text,
      toolCalls: choice.message.tool_calls?.map(toolCall => ({
        toolCallType: 'function',
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        args: toolCall.function.arguments!,
      })),
      finishReason: mapMistralFinishReason(choice.finish_reason),
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(args) },
      response: getResponseMetadata(response),
      warnings,
    };
  }
}
