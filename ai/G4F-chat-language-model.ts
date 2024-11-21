const { G4F, chunkProcessor } = require("g4f");
const g4f = new G4F();
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
import { convertToG4FChatMessages } from './convert-to-G4F-chat-messages';
import { mapG4FFinishReason } from './map-G4F-finish-reason';
import {
  G4FChatModelId,
  G4FChatSettings,
} from './G4F-chat-settings';
import { G4FFailedResponseHandler } from './G4F-error';
import { getResponseMetadata } from './get-response-metadata';
import { prepareTools } from './G4F-prepare-tools';

type G4FChatConfig = {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
};

export class G4FChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly defaultObjectGenerationMode = 'json';
  readonly supportsImageUrls = false;

  readonly modelId: G4FChatModelId;
  readonly settings: G4FChatSettings;

  private readonly config: G4FChatConfig;

  constructor(
    modelId: G4FChatModelId,
    settings: G4FChatSettings,
    config: G4FChatConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  private getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
  }: Parameters<LanguageModelV1['doGenerate']>[0]) {
    const type = mode.type;

    const warnings: LanguageModelV1CallWarning[] = [];

    if (topK != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'topK',
      });
    }

    if (frequencyPenalty != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'frequencyPenalty',
      });
    }

    if (presencePenalty != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'presencePenalty',
      });
    }

    if (stopSequences != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'stopSequences',
      });
    }

    if (
      responseFormat != null &&
      responseFormat.type === 'json' &&
      responseFormat.schema != null
    ) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'responseFormat',
        details: 'JSON response format schema is not supported',
      });
    }

    const baseArgs = {
      // model id:
      model: this.modelId,

      // model specific settings:
      safe_prompt: this.settings.safePrompt,

      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      random_seed: seed,

      // response format:
      response_format:
        responseFormat?.type === 'json' ? { type: 'json_object' } : undefined,

      // messages:
      messages: convertToG4FChatMessages(prompt),
    };

    switch (type) {
      case 'regular': {
        const { tools, tool_choice, toolWarnings } = prepareTools(mode);

        return {
          args: { ...baseArgs, tools, tool_choice },
          warnings: [...warnings, ...toolWarnings],
        };
      }

      case 'object-json': {
        return {
          args: {
            ...baseArgs,
            response_format: { type: 'json_object' },
          },
          warnings,
        };
      }

      case 'object-tool': {
        return {
          args: {
            ...baseArgs,
            tool_choice: 'any',
            tools: [{ type: 'function', function: mode.tool }],
          },
          warnings,
        };
      }

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV1['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { args, warnings } = this.getArgs(options);

    /*
    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: G4FFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        G4FChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });
    */
    /*
    const { G4F } = require("g4f");
    const g4f = new G4F();
    */
    const messages = [
        { role: "system", content: "You're an expert bot in poetry."},
        { role: "user", content: "Let's see, write a single paragraph-long poem for me." },
    ];
    const chatOptions = {
        model: "gpt-4",
        debug: true,
    	retry: {
            times: 3,
            condition: (text: string) => {
                const words = text.split(" ");
                return words.length > 10;
            }
        },
        output: (text: string) => {
            return text + " 💕🌹";
        }
    };
    
    console.log("TEST1");
    let text = await g4f.chatCompletion(messages, chatOptions);	
    console.log(text);

    /*
    const { messages: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];
    let text = choice.message.content ?? undefined;
    */

    // when there is a trailing assistant message, G4F will send the
    // content of that message again. we skip this repeated content to
    // avoid duplication, e.g. in continuation mode.
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage.role === 'assistant' &&
      text?.startsWith(lastMessage.content)
    ) {
      text = text.slice(lastMessage.content.length);
    }

    return {
      text,
      /*
      toolCalls: choice.message.tool_calls?.map(toolCall => ({
        toolCallType: 'function',
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        args: toolCall.function.arguments!,
      })),
      */
      finishReason: mapG4FFinishReason('unknown'),
      usage: {
        promptTokens: Number.NaN, //response.usage.prompt_tokens,
        completionTokens: Number.NaN, //response.usage.completion_tokens,
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(args) },
      response: getResponseMetadata(response),
      warnings,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1['doStream']>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1['doStream']>>> {
    const { args, warnings } = this.getArgs(options);
    const messages = convertToG4FChatMessages(args.messages); // Step 2: Prepare messages for G4F
  
    const streamOptions = {
      provider: g4f.providers.ChatBase,
      stream: true, // Step 3: Enable streaming
    };
  
    // Step 4: Call G4F API
    const response = await g4f.chatCompletion(messages, streamOptions);
  
    let finishReason: LanguageModelV1FinishReason = 'unknown';
    let usage: { promptTokens: number; completionTokens: number } = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN,
    };
  
    let chunkNumber = 0;
    let trimLeadingSpace = false;
  
    return {
      stream: chunkProcessor(response).pipeThrough( // Step 5: Process the response chunks
        new TransformStream<
          string,
          LanguageModelV1StreamPart
        >({
          transform(chunk, controller) {
            chunkNumber++;
  
            if (chunkNumber === 1) {
              // First chunk can have important metadata if needed
              controller.enqueue({
                type: 'response-metadata',
                // You may wish to extract metadata from the first chunk
              });
            }
  
            const choice = { delta: { content: chunk } }; // Assuming chunk is the text content.
  
            if (choice?.delta == null) {
              return;
            }
  
            const delta = choice.delta;
  
            if (chunkNumber <= 2) {
              const lastMessage = messages[messages.length - 1];
  
              if (
                lastMessage.role === 'assistant' &&
                delta.content === lastMessage.content.trimEnd()
              ) {
                if (delta.content.length < lastMessage.content.length) {
                  trimLeadingSpace = true;
                }
                return; // Skip repeated content
              }
            }
  
            if (delta.content != null) {
              controller.enqueue({
                type: 'text-delta',
                textDelta: trimLeadingSpace
                  ? delta.content.trimStart()
                  : delta.content,
              });
  
              trimLeadingSpace = false;
            }
  
            // Handle any tool calls if provided
            if (delta.tool_calls != null) {
              for (const toolCall of delta.tool_calls) {
                // G4F tool calls handling
                controller.enqueue({
                  type: 'tool-call',
                  toolCallType: 'function',
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  args: toolCall.function.arguments,
                });
              }
            }
          },
  
          flush(controller) {
            controller.enqueue({ type: 'finish', finishReason, usage });
          },
        }),
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: { /* You may set headers as per requirements */ } },
      request: { body: JSON.stringify(args) },
      warnings,
    };
  }
}

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const G4FChatResponseSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal('assistant'),
        content: z.string().nullable(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({ name: z.string(), arguments: z.string() }),
            }),
          )
          .nullish(),
      }),
      index: z.number(),
      finish_reason: z.string().nullish(),
    }),
  ),
  object: z.literal('chat.completion'),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
  }),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const G4FChatChunkSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      delta: z.object({
        role: z.enum(['assistant']).optional(),
        content: z.string().nullish(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({ name: z.string(), arguments: z.string() }),
            }),
          )
          .nullish(),
      }),
      finish_reason: z.string().nullish(),
      index: z.number(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
    })
    .nullish(),
});
