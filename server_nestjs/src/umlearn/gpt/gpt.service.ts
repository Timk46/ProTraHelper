import { Injectable } from '@nestjs/common';
import { HumanMessage, SystemMessage, BaseMessage, } from '@langchain/core/messages';
import { ChatOpenAI } from "@langchain/openai";
import { TUTOR_INSTRUCTIONS } from './system-message_sven';
import * as SimilarityLogPrompts from './system-message_similog';
import { editorDataDTO } from '@DTOs/index';
import { SimilarityCompareService } from '../compare/similarity-compare.service';


@Injectable()
export class GptService {
  private readonly chat: ChatOpenAI;

  constructor(private scService: SimilarityCompareService) {
    this.chat = new ChatOpenAI({
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-2024-08-06'
    });
  }

  /**
   * Sends a feedback request to the GPT chatbot.
   * @param solution - The solution provided by the user.
   * @param attempt - The user's attempt at solving the problem.
   * @returns A promise that resolves to an object containing the GPT feedback.
   */
  async sendFeedbackRequest(solution: editorDataDTO, attempt: editorDataDTO, taskDescription: string): Promise<{gptFeedback: string}>  {
    // Transform the UML diagrams to a more LLM-friendly format
    const transformToMermaid = (diagram: any) => {
      let mermaidCode = '```mermaid\nclassDiagram\n';

      // Process class elements
      for (const node of diagram.nodes) {
        const className = node.title;

        // Define class type (class, interface, abstract)
        if (node.type === "Interface") {
          mermaidCode += `  class ${className} {\n    <<interface>>\n`;
        } else if (node.type === "Abstrakte Klasse") {
          mermaidCode += `  class ${className} {\n    <<abstract>>\n`;
        } else {
          mermaidCode += `  class ${className} {\n`;
        }

        // Add attributes
        if (node.attributes) {
          for (const attr of node.attributes) {
            const visibility = attr.visibility === "private" ? "-" :
                             attr.visibility === "protected" ? "#" : "+";
            mermaidCode += `    ${visibility}${attr.name} ${attr.dataType}\n`;
          }
        }

        // Add methods
        if (node.methods) {
          for (const method of node.methods) {
            const visibility = method.visibility === "private" ? "-" :
                             method.visibility === "protected" ? "#" : "+";
            mermaidCode += `    ${visibility}${method.name}() ${method.returnType}\n`;
          }
        }
        mermaidCode += '  }\n';
      }

      // Process relationships
      for (const edge of diagram.edges) {
        const sourceClass = diagram.nodes.find(n => n.id === edge.start)?.title;
        const targetClass = diagram.nodes.find(n => n.id === edge.end)?.title;

        if (!sourceClass || !targetClass) continue;

        let relationSymbol = '';
        switch(edge.type) {
          case "Assoziation":
            relationSymbol = "-->";
            break;
          case "Gerichtete Assoziation":
            relationSymbol = "-->";
            break;
          case "Bidirektionale Assoziation":
            relationSymbol = "<-->";
            break;
          case "Aggregation":
            relationSymbol = "o--";
            break;
          case "Komposition":
            relationSymbol = "*--";
            break;
          case "Generalisierung":
            relationSymbol = "--|>";
            break;
          case "Implementierung":
            relationSymbol = "..|>";
            break;
          case "Abhängigkeit":
            relationSymbol = "..>";
            break;
          default:
            relationSymbol = "-->";
        }

        let relationship = `${sourceClass} ${relationSymbol} ${targetClass}`;

        // Add multiplicity if present
        if (edge.cardinalityStart || edge.cardinalityEnd) {
          relationship += ` : "${edge.cardinalityStart || ''} ${edge.cardinalityEnd || ''}"`;
        }

        mermaidCode += '  ' + relationship + '\n';
      }

      mermaidCode += '```';
      return mermaidCode;
    };

    const requestPack: BaseMessage[] = [];
    requestPack.push(new SystemMessage(TUTOR_INSTRUCTIONS));
    requestPack.push(new HumanMessage(
      '# Aufgabenstellung: \n\n'
      + taskDescription + '\n\n'
      + '# Musterlösung (Mermaid UML format): \n\n'
      + transformToMermaid(solution) + '\n\n'
      + '# Abgabe des Schülers (Mermaid UML format): \n\n' + transformToMermaid(attempt)
    ));

    return {gptFeedback: await this.getLLMResponse(requestPack)};
  }

  /**
   * Sends a feedback request based on the provided task description, attempt, and solution.
   * It generates a similarity log by comparing the attempt and solution, then constructs
   * a request package with system and human messages to get feedback from a language model.
   *
   * @param taskDescription - A description of the task for which feedback is being requested.
   * @param attempt - The user's attempt data in the form of an editorDataDTO.
   * @param solution - The correct solution data in the form of an editorDataDTO.
   * @returns A promise that resolves to an object containing the GPT feedback as a string.
   */
  async sendFeedbackRequestByLog(solution: editorDataDTO, attempt: editorDataDTO, taskDescription: string): Promise<{gptFeedback: string}> {
    const comparisonLog = this.scService.compare(attempt, solution);
    const requestPack: BaseMessage[] = [];
    requestPack.push(new SystemMessage(SimilarityLogPrompts.TUTOR_INSTRUCTIONS));
    requestPack.push(new HumanMessage(SimilarityLogPrompts.HUMAN_MESSAGE(taskDescription, comparisonLog)));

    return {gptFeedback: (await this.getLLMResponse(requestPack))};
  }

  /**
   * Retrieves a response from the language model based on the provided request messages.
   *
   * @param {BaseMessage[]} requestPack - An array of messages to send to the language model.
   * @returns {Promise<string>} - A promise that resolves to the response text from the language model.
   */
  async getLLMResponse(requestPack: BaseMessage[]): Promise<string> {
    const responsePack: BaseMessage = await this.chat.predictMessages(requestPack);
    let messageText = '';
    if (responsePack) {
      if (typeof responsePack.content === 'string') {
        messageText = responsePack.content;
      } else if (Array.isArray(responsePack.content)) {
        responsePack.content.forEach(item => {
          if (item.type === 'text') {
            messageText += item.text;
          }
        });
      }
    }
    return messageText;
  }

}
