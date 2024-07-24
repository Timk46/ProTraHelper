import { Inject, Injectable } from "@nestjs/common";
import { LangChainTracer } from "langchain/callbacks";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Client } from 'langsmith';
import * as fGPrompts from './feedback-generation.prompts';
import { REQUEST } from "@nestjs/core";
import { editorDataDTO, rawClassEdge, rawClassNode } from "@Interfaces/index";
import { Response } from 'express';
import { ChatPromptValue } from "langchain/dist/prompts/chat";

const KImodel = 'gpt-4-1106-preview';

const chatStream = new ChatOpenAI({
  modelName: KImodel,
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  streaming: true,
});

const client = new Client({
  apiUrl: 'https://api.smith.langchain.com',
  apiKey: process.env.LANGCHAIN_API_KEY,
});
const tracer = new LangChainTracer({
  projectName: 'GOALS',
  client,
});


@Injectable()
export class FeedbackRAGService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * Generates UML feedback based on the provided question, solution, and attempt.
   * @param question - The question related to the UML diagram.
   * @param solution - The solution UML diagram.
   * @param attempt - The attempted UML diagram.
   * @param resStream - Optional response stream for token streaming.
   * @returns A promise that resolves to an object containing the generated response.
   */
  async generateUmlFeedback(question: String, solution: editorDataDTO, attempt: editorDataDTO, resStream: Response = undefined): Promise<{response: string}> {
    //console.log("attempt solution", await this.filterUmlData(solution), await this.filterUmlData(attempt));
    const ragFormattedPrompt = await fGPrompts.umlQuestion.formatPromptValue({
      example: JSON.stringify(fGPrompts.exampleUmlJson),
      question: question,
      solution: JSON.stringify(await this.filterUmlData(solution)),
      attempt: JSON.stringify(await this.filterUmlData(attempt)),
    });

    return this.generateByChatPromptValue(ragFormattedPrompt, resStream);
  }

  async generateUmlFeedbackByHighlighted(question: String, highlightedData: editorDataDTO, points: number, resStream: Response = undefined): Promise<{response: string}> {
    console.log("highlighted data", JSON.stringify(await this.filterUmlData(highlightedData, true)));
    const ragFormattedPrompt = await fGPrompts.umlQuestionByHighlighted.formatPromptValue({
      //example: JSON.stringify(fGPrompts.exampleUmlJson),
      question: question,
      points: points,
      highlightedData: JSON.stringify(await this.filterUmlData(highlightedData, true)),
    });

    return this.generateByChatPromptValue(ragFormattedPrompt, resStream);
  }

  private async generateByChatPromptValue(promptValue: ChatPromptValue, ragStream: Response = undefined): Promise<{response: string}> {
    let responseString = '';
    const openAiResponse = await chatStream.generatePrompt(
      [promptValue],
      undefined,
      [
        {
          ignoreAgent: true,
          ignoreChain: true,
          handleLLMNewToken(token: string) {
            ragStream ? ragStream.write(token) : responseString += token; //for token streaming
          },
        },
        tracer,
      ],
    );
    console.log(openAiResponse);

    if (ragStream) {
      ragStream.end();
    }
    return {response: responseString};
  }

  /**
   * Filters the UML data by extracting only the necessary properties from the input data.
   *
   * @param data - The editor data containing nodes and edges.
   * @returns An object containing the filtered nodes and edges.
   */
  async filterUmlData(data: editorDataDTO, enableHighlights: boolean = false): Promise<{nodes: rawClassNode[], edges: rawClassEdge[]}> {
    const filteredNodes: rawClassNode[] = [];
    const filteredEdges: rawClassEdge[] = [];

    for (const node of data.nodes) {
      const filteredNode: rawClassNode = {
        id: node.id,
        type: node.type,
        title: node.title,
        attributes: node.attributes,
        methods: node.methods,
        highlighted: enableHighlights ? node.highlighted : undefined,
      };
      filteredNodes.push(filteredNode);
    }

    for (const edge of data.edges) {
      const filteredEdge: rawClassEdge = {
        id: edge.id,
        type: edge.type,
        start: edge.start,
        end: edge.end,
        cardinalityStart: edge.cardinalityStart,
        description: edge.description,
        cardinalityEnd: edge.cardinalityEnd,
        highlighted: enableHighlights ? edge.highlighted : undefined
      };
      filteredEdges.push(filteredEdge);
    }

    return {edges: filteredEdges, nodes: filteredNodes};
  }


}
