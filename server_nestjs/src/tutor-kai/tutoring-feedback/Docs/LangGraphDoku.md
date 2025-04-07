Workflows and Agents¶

This guide reviews common patterns for agentic systems. In describing these systems, it can be useful to make a distinction between "workflows" and "agents". One way to think about this difference is nicely explained here by Anthropic:

    Workflows are systems where LLMs and tools are orchestrated through predefined code paths. Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks.

Here is a simple way to visualize these differences:

Agent Workflow

When building agents and workflows, LangGraph offers a number of benefits including persistence, streaming, and support for debugging as well as deployment.
Set up¶

Note

The Functional API requires @langchain/langgraph>=0.2.24.

You can use any chat model that supports structured outputs and tool calling. Below, we show the process of installing the packages, setting API keys, and testing structured outputs / tool calling for Anthropic.
Install dependencies

Initialize an LLM

import { ChatAnthropic } from "@langchain/anthropic";

process.env.ANTHROPIC_API_KEY = "<your_anthropic_key>";

const llm = new ChatAnthropic({
  model: "claude-3-5-sonnet-latest",
});

Building Blocks: The Augmented LLM¶

LLM have augmentations that support building workflows and agents. These include structured outputs and tool calling, as shown in this image from the Anthropic blog:

augmented_llm.png

import { tool } from "@langchain/core/tools";
import { z } from "zod";

const searchQuerySchema = z.object({
  searchQuery: z.string().describe("Query that is optimized web search."),
  justification: z.string("Why this query is relevant to the user's request."),
});

// Augment the LLM with schema for structured output
const structuredLlm = llm.withStructuredOutput(searchQuerySchema, {
  name: "searchQuery",
});

// Invoke the augmented LLM
const output = await structuredLlm.invoke(
  "How does Calcium CT score relate to high cholesterol?"
);

const multiply = tool(
  async ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "multiplies two numbers together",
    schema: z.object({
      a: z.number("the first number"),
      b: z.number("the second number"),
    }),
  }
);

// Augment the LLM with tools
const llmWithTools = llm.bindTools([multiply]);

// Invoke the LLM with input that triggers the tool call
const message = await llmWithTools.invoke("What is 2 times 3?");

console.log(message.tool_calls);

Prompt chaining¶

In prompt chaining, each LLM call processes the output of the previous one.

As noted in the Anthropic blog:

    Prompt chaining decomposes a task into a sequence of steps, where each LLM call processes the output of the previous one. You can add programmatic checks (see "gate” in the diagram below) on any intermediate steps to ensure that the process is still on track.

    When to use this workflow: This workflow is ideal for situations where the task can be easily and cleanly decomposed into fixed subtasks. The main goal is to trade off latency for higher accuracy, by making each LLM call an easier task.

prompt_chain.png
Graph API
Functional API (beta)

import { StateGraph, Annotation } from "@langchain/langgraph";

// Graph state
const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  joke: Annotation<string>,
  improvedJoke: Annotation<string>,
  finalJoke: Annotation<string>,
});

// Define node functions

// First LLM call to generate initial joke
async function generateJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(`Write a short joke about ${state.topic}`);
  return { joke: msg.content };
}

// Gate function to check if the joke has a punchline
function checkPunchline(state: typeof StateAnnotation.State) {
  // Simple check - does the joke contain "?" or "!"
  if (state.joke?.includes("?") || state.joke?.includes("!")) {
    return "Pass";
  }
  return "Fail";
}

  // Second LLM call to improve the joke
async function improveJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(
    `Make this joke funnier by adding wordplay: ${state.joke}`
  );
  return { improvedJoke: msg.content };
}

// Third LLM call for final polish
async function polishJoke(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(
    `Add a surprising twist to this joke: ${state.improvedJoke}`
  );
  return { finalJoke: msg.content };
}

// Build workflow
const chain = new StateGraph(StateAnnotation)
  .addNode("generateJoke", generateJoke)
  .addNode("improveJoke", improveJoke)
  .addNode("polishJoke", polishJoke)
  .addEdge("__start__", "generateJoke")
  .addConditionalEdges("generateJoke", checkPunchline, {
    Pass: "improveJoke",
    Fail: "__end__"
  })
  .addEdge("improveJoke", "polishJoke")
  .addEdge("polishJoke", "__end__")
  .compile();

// Invoke
const state = await chain.invoke({ topic: "cats" });
console.log("Initial joke:");
console.log(state.joke);
console.log("\n--- --- ---\n");
if (state.improvedJoke !== undefined) {
  console.log("Improved joke:");
  console.log(state.improvedJoke);
  console.log("\n--- --- ---\n");

  console.log("Final joke:");
  console.log(state.finalJoke);
} else {
  console.log("Joke failed quality gate - no punchline detected!");
}

LangSmith Trace

https://smith.langchain.com/public/a0281fca-3a71-46de-beee-791468607b75/r
Parallelization¶

With parallelization, LLMs work simultaneously on a task:

    LLMs can sometimes work simultaneously on a task and have their outputs aggregated programmatically. This workflow, parallelization, manifests in two key variations: Sectioning: Breaking a task into independent subtasks run in parallel. Voting: Running the same task multiple times to get diverse outputs.

    When to use this workflow: Parallelization is effective when the divided subtasks can be parallelized for speed, or when multiple perspectives or attempts are needed for higher confidence results. For complex tasks with multiple considerations, LLMs generally perform better when each consideration is handled by a separate LLM call, allowing focused attention on each specific aspect.

parallelization.png
Graph API
Functional API (beta)

import { StateGraph, Annotation } from "@langchain/langgraph";

// Graph state
const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  joke: Annotation<string>,
  story: Annotation<string>,
  poem: Annotation<string>,
  combinedOutput: Annotation<string>,
});

// Nodes
// First LLM call to generate initial joke
async function callLlm1(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(`Write a joke about ${state.topic}`);
  return { joke: msg.content };
}

// Second LLM call to generate story
async function callLlm2(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(`Write a story about ${state.topic}`);
  return { story: msg.content };
}

// Third LLM call to generate poem
async function callLlm3(state: typeof StateAnnotation.State) {
  const msg = await llm.invoke(`Write a poem about ${state.topic}`);
  return { poem: msg.content };
}

// Combine the joke, story and poem into a single output
async function aggregator(state: typeof StateAnnotation.State) {
  const combined = `Here's a story, joke, and poem about ${state.topic}!\n\n` +
    `STORY:\n${state.story}\n\n` +
    `JOKE:\n${state.joke}\n\n` +
    `POEM:\n${state.poem}`;
  return { combinedOutput: combined };
}

// Build workflow
const parallelWorkflow = new StateGraph(StateAnnotation)
  .addNode("callLlm1", callLlm1);
  .addNode("callLlm2", callLlm2);
  .addNode("callLlm3", callLlm3);
  .addNode("aggregator", aggregator);
  .addEdge("__start__", "callLlm1");
  .addEdge("__start__", "callLlm2");
  .addEdge("__start__", "callLlm3");
  .addEdge("callLlm1", "aggregator");
  .addEdge("callLlm2", "aggregator");
  .addEdge("callLlm3", "aggregator");
  .addEdge("aggregator", "__end__");
  .compile();

// Invoke
const result = await parallelWorkflow.invoke({ topic: "cats" });
console.log(result.combinedOutput);

LangSmith Trace

https://smith.langchain.com/public/3be2e53c-ca94-40dd-934f-82ff87fac277/r

Resources:

Documentation

See our documentation on parallelization here.
Routing¶

Routing classifies an input and directs it to a followup task. As noted in the Anthropic blog:

    Routing classifies an input and directs it to a specialized followup task. This workflow allows for separation of concerns, and building more specialized prompts. Without this workflow, optimizing for one kind of input can hurt performance on other inputs.

    When to use this workflow: Routing works well for complex tasks where there are distinct categories that are better handled separately, and where classification can be handled accurately, either by an LLM or a more traditional classification model/algorithm.

routing.png
Graph API
Functional API (beta)

import { StateGraph, Annotation } from "@langchain/langgraph";
import { z } from "zod";

// Schema for structured output to use as routing logic
const routeSchema = z.object({
  step: z.enum(["poem", "story", "joke"]).describe(
    "The next step in the routing process"
  ),
});

// Augment the LLM with schema for structured output
const router = llm.withStructuredOutput(routeSchema);

// Graph state
const StateAnnotation = Annotation.Root({
  input: Annotation<string>,
  decision: Annotation<string>,
  output: Annotation<string>,
});

// Nodes
// Write a story
async function llmCall1(state: typeof StateAnnotation.State) {
  const result = await llm.invoke([{
    role: "system",
    content: "You are an expert storyteller.",
  }, {
    role: "user",
    content: state.input
  }]);
  return { output: result.content };
}

// Write a joke
async function llmCall2(state: typeof StateAnnotation.State) {
  const result = await llm.invoke([{
    role: "system",
    content: "You are an expert comedian.",
  }, {
    role: "user",
    content: state.input
  }]);
  return { output: result.content };
}

// Write a poem
async function llmCall3(state: typeof StateAnnotation.State) {
  const result = await llm.invoke([{
    role: "system",
    content: "You are an expert poet.",
  }, {
    role: "user",
    content: state.input
  }]);
  return { output: result.content };
}

async function llmCallRouter(state: typeof StateAnnotation.State) {
  // Route the input to the appropriate node
  const decision = await router.invoke([
    {
      role: "system",
      content: "Route the input to story, joke, or poem based on the user's request."
    },
    {
      role: "user",
      content: state.input
    },
  ]);

  return { decision: decision.step };
}

// Conditional edge function to route to the appropriate node
function routeDecision(state: typeof StateAnnotation.State) {
  // Return the node name you want to visit next
  if (state.decision === "story") {
    return "llmCall1";
  } else if (state.decision === "joke") {
    return "llmCall2";
  } else if (state.decision === "poem") {
    return "llmCall3";
  }
}

// Build workflow
const routerWorkflow = new StateGraph(StateAnnotation)
  .addNode("llmCall1", llmCall1)
  .addNode("llmCall2", llmCall2)
  .addNode("llmCall3", llmCall3)
  .addNode("llmCallRouter", llmCallRouter)
  .addEdge("__start__", "llmCallRouter")
  .addConditionalEdges(
    "llmCallRouter",
    routeDecision,
    ["llmCall1", "llmCall2", "llmCall3"],
  )
  .addEdge("llmCall1", "__end__")
  .addEdge("llmCall2", "__end__")
  .addEdge("llmCall3", "__end__")
  .compile();

// Invoke
const state = await routerWorkflow.invoke({
  input: "Write me a joke about cats"
});
console.log(state.output);

LangSmith Trace

https://smith.langchain.com/public/c4580b74-fe91-47e4-96fe-7fac598d509c/r

Examples

Here is RAG workflow that routes questions. See our video here.
Orchestrator-Worker¶

With orchestrator-worker, an orchestrator breaks down a task and delegates each sub-task to workers. As noted in the Anthropic blog:

    In the orchestrator-workers workflow, a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results.

    When to use this workflow: This workflow is well-suited for complex tasks where you can’t predict the subtasks needed (in coding, for example, the number of files that need to be changed and the nature of the change in each file likely depend on the task). Whereas it’s topographically similar, the key difference from parallelization is its flexibility—subtasks aren't pre-defined, but determined by the orchestrator based on the specific input.

worker.png
Graph API
Functional API (beta)

import { z } from "zod";

// Schema for structured output to use in planning
const sectionSchema = z.object({
  name: z.string().describe("Name for this section of the report."),
  description: z.string().describe(
    "Brief overview of the main topics and concepts to be covered in this section."
  ),
});

const sectionsSchema = z.object({
  sections: z.array(sectionSchema).describe("Sections of the report."),
});

// Augment the LLM with schema for structured output
const planner = llm.withStructuredOutput(sectionsSchema);

Creating Workers in LangGraph

Because orchestrator-worker workflows are common, LangGraph has the Send API to support this. It lets you dynamically create worker nodes and send each one a specific input. Each worker has its own state, and all worker outputs are written to a shared state key that is accessible to the orchestrator graph. This gives the orchestrator access to all worker output and allows it to synthesize them into a final output. As you can see below, we iterate over a list of sections and Send each to a worker node. See further documentation here and here.

import { Annotation, StateGraph, Send } from "@langchain/langgraph";

// Graph state
const StateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  sections: Annotation<Array<z.infer<typeof sectionSchema>>>,
  completedSections: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
  finalReport: Annotation<string>,
});

// Worker state
const WorkerStateAnnotation = Annotation.Root({
  section: Annotation<z.infer<typeof sectionSchema>>,
  completedSections: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});

// Nodes
async function orchestrator(state: typeof StateAnnotation.State) {
  // Generate queries
  const reportSections = await planner.invoke([
    { role: "system", content: "Generate a plan for the report." },
    { role: "user", content: `Here is the report topic: ${state.topic}` },
  ]);

  return { sections: reportSections.sections };
}

async function llmCall(state: typeof WorkerStateAnnotation.State) {
  // Generate section
  const section = await llm.invoke([
    {
      role: "system",
      content: "Write a report section following the provided name and description. Include no preamble for each section. Use markdown formatting.",
    },
    {
      role: "user",
      content: `Here is the section name: ${state.section.name} and description: ${state.section.description}`,
    },
  ]);

  // Write the updated section to completed sections
  return { completedSections: [section.content] };
}

async function synthesizer(state: typeof StateAnnotation.State) {
  // List of completed sections
  const completedSections = state.completedSections;

  // Format completed section to str to use as context for final sections
  const completedReportSections = completedSections.join("\n\n---\n\n");

  return { finalReport: completedReportSections };
}

// Conditional edge function to create llm_call workers that each write a section of the report
function assignWorkers(state: typeof StateAnnotation.State) {
  // Kick off section writing in parallel via Send() API
  return state.sections.map((section) =>
    new Send("llmCall", { section })
  );
}

// Build workflow
const orchestratorWorker = new StateGraph(StateAnnotation)
  .addNode("orchestrator", orchestrator)
  .addNode("llmCall", llmCall)
  .addNode("synthesizer", synthesizer)
  .addEdge("__start__", "orchestrator")
  .addConditionalEdges(
    "orchestrator",
    assignWorkers,
    ["llmCall"]
  )
  .addEdge("llmCall", "synthesizer")
  .addEdge("synthesizer", "__end__")
  .compile();

// Invoke
const state = await orchestratorWorker.invoke({
  topic: "Create a report on LLM scaling laws"
});
console.log(state.finalReport);

LangSmith Trace

https://smith.langchain.com/public/78cbcfc3-38bf-471d-b62a-b299b144237d/r

Resources:

Examples

Here is a project that uses orchestrator-worker for report planning and writing. See our video here.
Evaluator-optimizer¶

In the evaluator-optimizer workflow, one LLM call generates a response while another provides evaluation and feedback in a loop:

    In the evaluator-optimizer workflow, one LLM call generates a response while another provides evaluation and feedback in a loop.

    When to use this workflow: This workflow is particularly effective when we have clear evaluation criteria, and when iterative refinement provides measurable value. The two signs of good fit are, first, that LLM responses can be demonstrably improved when a human articulates their feedback; and second, that the LLM can provide such feedback. This is analogous to the iterative writing process a human writer might go through when producing a polished document.

evaluator_optimizer.png
Graph API
Functional API (beta)

import { z } from "zod";
import { Annotation, StateGraph } from "@langchain/langgraph";

// Graph state
const StateAnnotation = Annotation.Root({
  joke: Annotation<string>,
  topic: Annotation<string>,
  feedback: Annotation<string>,
  funnyOrNot: Annotation<string>,
});

// Schema for structured output to use in evaluation
const feedbackSchema = z.object({
  grade: z.enum(["funny", "not funny"]).describe(
    "Decide if the joke is funny or not."
  ),
  feedback: z.string().describe(
    "If the joke is not funny, provide feedback on how to improve it."
  ),
});

// Augment the LLM with schema for structured output
const evaluator = llm.withStructuredOutput(feedbackSchema);

// Nodes
async function llmCallGenerator(state: typeof StateAnnotation.State) {
  // LLM generates a joke
  let msg;
  if (state.feedback) {
    msg = await llm.invoke(
      `Write a joke about ${state.topic} but take into account the feedback: ${state.feedback}`
    );
  } else {
    msg = await llm.invoke(`Write a joke about ${state.topic}`);
  }
  return { joke: msg.content };
}

async function llmCallEvaluator(state: typeof StateAnnotation.State) {
  // LLM evaluates the joke
  const grade = await evaluator.invoke(`Grade the joke ${state.joke}`);
  return { funnyOrNot: grade.grade, feedback: grade.feedback };
}

// Conditional edge function to route back to joke generator or end based upon feedback from the evaluator
function routeJoke(state: typeof StateAnnotation.State) {
  // Route back to joke generator or end based upon feedback from the evaluator
  if (state.funnyOrNot === "funny") {
    return "Accepted";
  } else if (state.funnyOrNot === "not funny") {
    return "Rejected + Feedback";
  }
}

// Build workflow
const optimizerWorkflow = new StateGraph(StateAnnotation)
  .addNode("llmCallGenerator", llmCallGenerator)
  .addNode("llmCallEvaluator", llmCallEvaluator)
  .addEdge("__start__", "llmCallGenerator")
  .addEdge("llmCallGenerator", "llmCallEvaluator")
  .addConditionalEdges(
    "llmCallEvaluator",
    routeJoke,
    {
      // Name returned by routeJoke : Name of next node to visit
      "Accepted": "__end__",
      "Rejected + Feedback": "llmCallGenerator",
    }
  )
  .compile();

// Invoke
const state = await optimizerWorkflow.invoke({ topic: "Cats" });
console.log(state.joke);

LangSmith Trace

https://smith.langchain.com/public/86ab3e60-2000-4bff-b988-9b89a3269789/r

Resources:

Examples

Here is an assistant that uses evaluator-optimizer to improve a report. See our video here.

Here is a RAG workflow that grades answers for hallucinations or errors. See our video here.
Agent¶

Agents are typically implemented as an LLM performing actions (via tool-calling) based on environmental feedback in a loop. As noted in the Anthropic blog:

    Agents can handle sophisticated tasks, but their implementation is often straightforward. They are typically just LLMs using tools based on environmental feedback in a loop. It is therefore crucial to design toolsets and their documentation clearly and thoughtfully.

    When to use agents: Agents can be used for open-ended problems where it’s difficult or impossible to predict the required number of steps, and where you can’t hardcode a fixed path. The LLM will potentially operate for many turns, and you must have some level of trust in its decision-making. Agents' autonomy makes them ideal for scaling tasks in trusted environments.

agent.png

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Define tools
const multiply = tool(
  async ({ a, b }: { a: number; b: number }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "Multiply two numbers together",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const add = tool(
  async ({ a, b }: { a: number; b: number }) => {
    return a + b;
  },
  {
    name: "add",
    description: "Add two numbers together",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

const divide = tool(
  async ({ a, b }: { a: number; b: number }) => {
    return a / b;
  },
  {
    name: "divide",
    description: "Divide two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  }
);

// Augment the LLM with tools
const tools = [add, multiply, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools);

Graph API
Functional API (beta)

import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";

// Nodes
async function llmCall(state: typeof MessagesAnnotation.State) {
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
    },
    ...state.messages
  ]);

  return {
    messages: [result]
  };
}

const toolNode = new ToolNode(tools);

// Conditional edge function to route to the tool node or end
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  // If the LLM makes a tool call, then perform an action
  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Build workflow
const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  // Add edges to connect nodes
  .addEdge("__start__", "llmCall")
  .addConditionalEdges(
    "llmCall",
    shouldContinue,
    {
      // Name returned by shouldContinue : Name of next node to visit
      "Action": "tools",
      "__end__": "__end__",
    }
  )
  .addEdge("tools", "llmCall")
  .compile();

// Invoke
const messages = [{
  role: "user",
  content: "Add 3 and 4."
}];
const result = await agentBuilder.invoke({ messages });
console.log(result.messages);

LangSmith Trace

https://smith.langchain.com/public/051f0391-6761-4f8c-a53b-22231b016690/r

Examples

Here is a project that uses a tool calling agent to create / store long-term memories.
Pre-built¶

LangGraph also provides a pre-built method for creating an agent as defined above (using the createReactAgent function):

https://langchain-ai.github.io/langgraphjs/how-tos/create-react-agent/

import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Pass in:
// (1) an LLM instance
// (2) the tools list (which is used to create the tool node)
const prebuiltAgent = createReactAgent({
  llm: llmWithTools,
  tools,
});

// invoke
const result = await prebuiltAgent.invoke({
  messages: [
    {
      role: "user",
      content: "Add 3 and 4.",
    },
  ],
});
console.log(result.messages);

LangSmith Trace

https://smith.langchain.com/public/abab6a44-29f6-4b97-8164-af77413e494d/r

Structured outputs
Overview
For many applications, such as chatbots, models need to respond to users directly in natural language. However, there are scenarios where we need models to output in a structured format. For example, we might want to store the model output in a database and ensure that the output conforms to the database schema. This need motivates the concept of structured output, where models can be instructed to respond with a particular output structure.

Structured output

Key concepts
(1) Schema definition: The output structure is represented as a schema, which can be defined in several ways. (2) Returning structured output: The model is given this schema, and is instructed to return output that conforms to it.

Recommended usage
This pseudo-code illustrates the recommended workflow when using structured output. LangChain provides a method, withStructuredOutput(), that automates the process of binding the schema to the model and parsing the output. This helper function is available for all model providers that support structured output.

// Define schema
const schema = { foo: "bar" };
// Bind schema to model
const modelWithStructure = model.withStructuredOutput(schema);
// Invoke the model to produce structured output that matches the schema
const structuredOutput = await modelWithStructure.invoke(userInput);

Schema definition
The central concept is that the output structure of model responses needs to be represented in some way. While types of objects you can use depend on the model you're working with, there are common types of objects that are typically allowed or recommended for structured output in TypeScript.

The simplest and most common format for structured output is a Zod schema definition:

import { z } from "zod";

const ResponseFormatter = z.object({
  answer: z.string().describe("The answer to the user's question"),
  followup_question: z
    .string()
    .describe("A followup question the user could ask"),
});

You can also define a JSONSchema object, which is what Zod schemas are converted to internally before being sent to the model provider:

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/product.schema.json",
  "title": "ResponseFormatter",
  "type": "object",
  "properties": {
    "answer": {
      "description": "The answer to the user's question",
      "type": "string"
    },
    "followup_question": {
      "description": "A followup question the user could ask",
      "type": "string"
    }
  },
  "required": ["answer", "followup_question"]
}

Returning structured output
With a schema defined, we need a way to instruct the model to use it. While one approach is to include this schema in the prompt and ask nicely for the model to use it, this is not recommended. Several more powerful methods that utilizes native features in the model provider's API are available.

Using tool calling
Many model providers support tool calling, a concept discussed in more detail in our tool calling guide. In short, tool calling involves binding a tool to a model and, when appropriate, the model can decide to call this tool and ensure its response conforms to the tool's schema. With this in mind, the central concept is straightforward: create a tool with our schema and bind it to the model! Here is an example using the ResponseFormatter schema defined above:

import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
});

// Create a tool with ResponseFormatter as its schema.
const responseFormatterTool = tool(async () => {}, {
  name: "responseFormatter",
  schema: ResponseFormatter,
});

// Bind the created tool to the model
const modelWithTools = model.bindTools([responseFormatterTool]);

// Invoke the model
const aiMsg = await modelWithTools.invoke(
  "What is the powerhouse of the cell?"
);

JSON mode
In addition to tool calling, some model providers support a feature called JSON mode. This supports JSON schema definition as input and enforces the model to produce a conforming JSON output. You can find a table of model providers that support JSON mode here. Here is an example of how to use JSON mode with OpenAI:

import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4",
}).bind({
  response_format: { type: "json_object" },
});

const aiMsg = await model.invoke(
  "Return a JSON object with key 'random_nums' and a value of 10 random numbers in [0-99]"
);
console.log(aiMsg.content);
// Output: {
//   "random_nums": [23, 47, 89, 15, 34, 76, 58, 3, 62, 91]
// }

One important point to flag: the model still returns a string, which needs to be parsed into a JSON object. This can, of course, simply use the json library or a JSON output parser if you need more advanced functionality. See this how-to guide on the JSON output parser for more details.

import json
const jsonObject = JSON.parse(aiMsg.content)
// {'random_ints': [23, 47, 89, 15, 34, 76, 58, 3, 62, 91]}

Structured output method
There are a few challenges when producing structured output with the above methods:

(1) If using tool calling, tool call arguments needs to be parsed from an object back to the original schema.

(2) In addition, the model needs to be instructed to always use the tool when we want to enforce structured output, which is a provider specific setting.

(3) If using JSON mode, the output needs to be parsed into a JSON object.

With these challenges in mind, LangChain provides a helper function (withStructuredOutput()) to streamline the process.

Diagram of with structured output

This both binds the schema to the model as a tool and parses the output to the specified output schema.

// Bind the schema to the model
const modelWithStructure = model.withStructuredOutput(ResponseFormatter);
// Invoke the model
const structuredOutput = await modelWithStructure.invoke(
  "What is the powerhouse of the cell?"
);
// Get back the object
console.log(structuredOutput);
// { answer: "The powerhouse of the cell is the mitochondrion. Mitochondria are organelles that generate most of the cell's supply of adenosine triphosphate (ATP), which is used as a source of chemical energy.", followup_question: "What is the function of ATP in the cell?" }


[Further reading]
For more details on usage, see our how-to guide.
