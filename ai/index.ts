import { openai } from '@ai-sdk/openai';
const { G4F } = require("g4f");

import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

import { customMiddleware } from './custom-middleware';


//--- TODO custom handler
const { G4F } = require("g4f");
const g4f = new G4F();
const messages = [
    { role: "system", content: "You're an expert bot in poetry."},
    { role: "user", content: "Let's see, write a single paragraph-long poem for me." },
];
const options = {
    model: "gpt-4",
    debug: true,
	retry: {
        times: 3,
        condition: (text) => {
            const words = text.split(" ");
            return words.length > 10;
        }
    },
    output: (text) => {
        return text + " 💕🌹";
    }
};

console.log("TEST");
(async() => {
    const text = await g4f.chatCompletion(messages, options);	
    console.log(text);
})();

//---
export const customModel = (apiIdentifier: string) => {
  return wrapLanguageModel({
    model: openai(apiIdentifier),
    middleware: customMiddleware,
  });
};
