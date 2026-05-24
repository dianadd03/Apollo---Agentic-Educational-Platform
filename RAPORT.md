# Report: How We Used AI Tools in Our Software Development Project

## 1. Introduction

In our project, we used artificial intelligence tools as development assistants throughout different stages of the software development process. These tools helped us write code, generate tests, improve documentation, debug problems, review ideas, and make implementation decisions faster.

The AI tools we used were:

- ChatGPT
- Codex
- Claude
- Antigravity
- local models through Ollama

We did not use AI as a replacement for our own work. Instead, we used it as a support tool. The final decisions, debugging, integration, and validation were done by us.

A very important part of our project was the AI agent logic. For this part, we debugged the behavior manually, because agent logic depends on prompts, context, data flow, retrieved information, and expected outputs. We also implemented a hybrid RAG architecture, combining local database retrieval with additional search capabilities when needed.

## 2. AI Tools Used by Our Team

## 2.1 ChatGPT

We used ChatGPT for explanations, debugging support, writing prompts, planning features, improving documentation, and discussing possible implementation approaches.

It was useful when we needed to understand errors, design workflows, create reports, or clarify how different parts of the project should work together.

## 2.2 Codex

We used Codex mainly for implementation tasks. It helped us generate code, create unit tests, and modify parts of the project more efficiently.

Codex was especially useful when we wanted to generate tests for our project or when we needed help implementing clearly defined features.

## 2.3 Claude

We used Claude as an additional AI assistant for reasoning, reviewing ideas, improving explanations, and comparing possible solutions.

It helped us refine some implementation decisions and check whether certain approaches made sense.

## 2.4 Antigravity

We used Antigravity as an AI-assisted development environment. It helped with coding, navigating the project, and working directly with the codebase.

This made it easier to move through the project structure and apply changes faster.

## 2.5 Ollama Models

We also used some local models through Ollama. These were useful because they could run locally, giving us more control over the environment and reducing dependency on external AI services.

Using local models was also useful when we wanted to experiment with AI behavior in a more controlled way.

## 3. How We Used AI in the Project

## 3.1 Code Generation

We used AI tools to generate parts of the code, including functions, backend logic, frontend components, configuration files, and helper code.

This helped us move faster, especially for repetitive or boilerplate tasks. However, we did not copy AI-generated code blindly. We reviewed it, adapted it to our project, and tested it before keeping it.

## 3.2 Debugging

AI tools helped us understand error messages, stack traces, logs, and failing tests. They gave us possible explanations and solutions when something did not work correctly.

However, for the AI agent logic, we debugged manually. This was necessary because agent behavior can be unpredictable and depends on many factors, such as prompts, retrieved context, model responses, and the way data is passed between components.

Manual debugging helped us understand what the agents were actually doing and allowed us to fix problems more carefully.

## 3.3 Refactoring

We used AI to get suggestions for improving code structure, readability, naming, and modularity.

Even when AI suggested refactoring changes, we reviewed them carefully to make sure they did not change the expected behavior of the application.

## 3.4 Unit Tests

We used Codex to help generate unit tests for our project. This helped us cover normal cases, edge cases, and possible validation errors.

The generated tests still needed to be checked by us. We had to make sure that the tests matched the actual requirements and that they tested the correct behavior.

## 3.5 Documentation

We used AI tools to help write and improve documentation, explanations, reports, and technical summaries.

This made it easier to describe what the project does, how different components work, and how certain features were implemented.

## 3.6 AI Agent Logic

Our project included AI agents, and this was one of the areas where human control was especially important.

Although AI tools helped us design prompts and understand possible agent workflows, the actual debugging of the AI agent logic was done manually. We checked how the agents behaved, what outputs they produced, and whether their responses matched the expected format and purpose.

This manual debugging was important because AI agents are not always deterministic. Small changes in prompts, retrieved information, or context can change the final output.

## 3.7 Hybrid RAG Architecture

We implemented a hybrid RAG architecture.

The system first searches the local database for relevant materials. If it does not find enough suitable materials, it can extend the search using additional sources.

This hybrid approach was useful because it allowed the project to combine structured local data with broader search capabilities. It also made the system more flexible, because it did not depend only on one retrieval method.

## 4. Benefits for Our Project

Using AI tools helped us in several ways:

- We worked faster on repetitive implementation tasks.
- We generated test ideas more easily.
- We understood errors and bugs faster.
- We improved documentation more efficiently.
- We received suggestions for code structure and feature design.
- We explored different implementation approaches.
- We used local Ollama models for more controlled experiments.
- We improved the design of the hybrid RAG architecture.

Overall, AI helped us save time and focus more on important development decisions.

## 5. Risks and Limitations We Observed

Even though AI tools were useful, they also had limitations.

Sometimes AI-generated code was incomplete, incorrect, or not fully adapted to our project structure. AI tools could also misunderstand the architecture or suggest solutions that looked correct but did not fit our actual requirements.

The main risks we observed were:

- AI could generate code with bugs.
- AI could misunderstand the project context.
- AI could suggest solutions that did not match our architecture.
- AI-generated tests still needed manual validation.
- AI agent behavior could be unpredictable.
- External AI tools could raise confidentiality concerns.
- Overreliance on AI could lead to accepting code without understanding it.

Because of this, we treated AI outputs as suggestions, not final solutions.

## 6. Best Practices We Followed

During the project, we followed several practices to use AI responsibly:

- We reviewed AI-generated code before using it.
- We tested code after AI-assisted changes.
- We used AI mostly for clearly defined tasks.
- We adapted generated code to our own architecture.
- We manually debugged the AI agent logic.
- We validated generated tests.
- We checked whether documentation matched the real implementation.
- We used local Ollama models when local experimentation was useful.
- We treated AI as a helper, not as an automatic solution.

These practices helped us benefit from AI while still keeping control over the project.

## 7. Impact on Our Work as Developers

Using AI changed the way we worked. Instead of only writing everything manually, we also had to review, validate, and improve AI-generated suggestions.

This meant that our role was not just to write code, but also to:

- define clear requirements;
- write better prompts;
- check generated code;
- debug problems manually;
- validate tests;
- understand the architecture;
- evaluate RAG results;
- make final technical decisions.

In our project, this was especially important for the AI agents and the hybrid RAG architecture, where correctness depended on careful validation.

## 8. Conclusion

In our software development project, we used ChatGPT, Codex, Claude, Antigravity, and local Ollama models to support implementation, testing, debugging, documentation, and architectural decisions.

AI tools helped us work faster and explore solutions more easily, but they did not replace our own technical work. We still had to review code, test features, debug problems, and make final decisions.

The AI agent logic was debugged manually because we needed to understand and control the behavior of the agents. The RAG architecture was implemented as a hybrid solution, combining local database retrieval with additional search capabilities when needed.

Overall, AI was useful for our project because it improved productivity and supported development. However, it had to be used carefully. The most important rule was that every AI-generated suggestion needed to be reviewed, tested, and adapted by us.
