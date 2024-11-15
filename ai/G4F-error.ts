import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils';
import { z } from 'zod';

const G4FErrorDataSchema = z.object({
  object: z.literal('error'),
  message: z.string(),
  type: z.string(),
  param: z.string().nullable(),
  code: z.string().nullable(),
});

export type G4FErrorData = z.infer<typeof G4FErrorDataSchema>;

export const G4FFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: G4FErrorDataSchema,
  errorToMessage: data => data.message,
});
