//import { openai } from '@ai-sdk/openai';
const { G4F } = require("g4f");

import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

import { customMiddleware } from './custom-middleware';

//export const customModel = (apiIdentifier: string) => {
  //return wrapLanguageModel({
    //model: openai(apiIdentifier),
    //middleware: customMiddleware,
  //});
//};
export const customModel = new G4F();
const messages = [
    { role: "user", content: "Hi, what's up?"}
];
customModel.chatCompletion(messages).then(console.log);
