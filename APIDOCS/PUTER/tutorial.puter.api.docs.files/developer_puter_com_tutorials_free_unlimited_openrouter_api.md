## [Tutorials](https://developer.puter.com/tutorials/)

# Free, Unlimited OpenRouter API

This tutorial will show you how to use [Puter.js](https://docs.puter.com/) to access [OpenRouter](https://developer.puter.com/encyclopedia/openrouter/)'s extensive collection of AI models for free, without any API keys or backend setup. OpenRouter is a unified API gateway that provides access to hundreds of AI models from various providers including OpenAI, Anthropic, Meta, Google, Mistral, and many others.

Puter is the pioneer of the "User Pays" model, which allows developers to incorporate AI capabilities into their applications while users cover their own usage costs. This innovative approach eliminates the need for developers to manage API keys or worry about billing, making advanced AI accessible to everyone.

## What is OpenRouter?

[OpenRouter](https://openrouter.ai/) is a platform that simplifies access to a wide range of AI models through a single, unified API. It acts as a middleman between your application and various AI providers, handling the authentication and routing so you don't have to maintain multiple API keys or manage complex integrations. With OpenRouter, you can access models from OpenAI, Anthropic, Meta, Google, and many other providers through one consistent interface.

## Getting Started

Puter.js is completely serverless and works without any API keys or server-side setup. To start using Puter.js for accessing OpenRouter models, include the following script tag in your HTML file:

```hljs xml
<script src="https://js.puter.com/v2/"></script>

```

That's it! You're now ready to use Puter.js for free access to hundreds of AI models. No API keys, backend setup, or server-side code required. Everything is handled on the frontend.

## Example 1Basic Text Generation with Llama 3

Let's start with a simple example that uses Meta's Llama 3 model for text generation:

```html hljs language-xml
<html>
<body>
    <script src="https://js.puter.com/v2/"></script>
    <script>
        puter.ai.chat("Explain quantum computing in simple terms",
            {model: 'openrouter:meta-llama/llama-3.1-8b-instruct'})
            .then(response => {
                document.body.innerHTML = response;
            });
    </script>
</body>
</html>

```

This example demonstrates how to generate text using Meta's Llama 3.1 8B model through OpenRouter. The model will provide a simple explanation of quantum computing, showcasing its ability to explain complex concepts in an accessible way.

## Example 2Streaming Responses with Claude 3.7 Sonnet

For longer responses, it's often better to stream the results. Here's how to use streaming with Anthropic's Claude 3.7 Sonnet model:

```html hljs language-xml
<html>
<body>
    <div id="response"></div>
    <script src="https://js.puter.com/v2/"></script>
    <script>
        async function streamResponse() {
            const outputDiv = document.getElementById('response');

            const response = await puter.ai.chat(
                "Write a short story about a robot that discovers emotions",
                {model: 'openrouter:anthropic/claude-3.7-sonnet', stream: true}
            );

            for await (const part of response) {
                if (part?.text) {
                    outputDiv.innerHTML += part.text;
                }
            }
        }

        streamResponse();
    </script>
</body>
</html>

```

This example shows how to stream responses from Anthropic's Claude 3.7 Sonnet model. Streaming is particularly useful for longer creative content like stories, where users can see the text appear in real-time rather than waiting for the entire response.

## Example 3Model Selection Interface

Let's create a simple interface that allows users to select from different models:

```html hljs language-xml
<html>
<body>
    <div style="max-width: 800px; margin: 20px auto; font-family: Arial, sans-serif;">
        <h1>OpenRouter Model Explorer</h1>
        <select id="model-select" style="padding: 8px; margin-bottom: 10px;">
            <option value="openrouter:meta-llama/llama-3.1-8b-instruct">Meta Llama 3.1 (8B)</option>
            <option value="openrouter:anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet</option>
            <option value="openrouter:mistralai/mistral-7b-instruct">Mistral 7B</option>
            <option value="openrouter:google/gemini-pro-1.5">Google Gemini Pro 1.5</option>
            <option value="openrouter:openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
        </select>
        <textarea id="prompt" rows="4" style="width: 100%; padding: 8px; margin-bottom: 10px;"
            placeholder="Enter your prompt here...">Explain how solar panels work.</textarea>
        <button id="generate" style="padding: 8px 16px;">Generate</button>
        <div id="loading" style="display: none; margin-top: 10px;">Generating response...</div>
        <div id="response" style="margin-top: 20px; padding: 15px; border: 1px solid #ddd;
            border-radius: 5px; min-height: 200px;"></div>
    </div>

    <script src="https://js.puter.com/v2/"></script>
    <script>
        document.getElementById('generate').addEventListener('click', async () => {
            const modelSelect = document.getElementById('model-select');
            const promptInput = document.getElementById('prompt');
            const responseDiv = document.getElementById('response');
            const loadingDiv = document.getElementById('loading');

            const selectedModel = modelSelect.value;
            const prompt = promptInput.value;

            if (!prompt) return;

            responseDiv.innerHTML = '';
            loadingDiv.style.display = 'block';

            try {
                const response = await puter.ai.chat(prompt, {model: selectedModel});
                responseDiv.innerHTML = response;
            } catch (error) {
                responseDiv.innerHTML = `Error: ${error.message}`;
            } finally {
                loadingDiv.style.display = 'none';
            }
        });
    </script>
</body>
</html>

```

This example creates a simple interface where users can select from different models provided through OpenRouter and generate responses to their prompts. The interface includes a dropdown for model selection, a textarea for entering prompts, and a button to generate responses.

## List of Models

The following is a list of OpenRouter models available through Puter.js as of March 2025:

```hljs javascript

openrouter:01-ai/yi-large
openrouter:aetherwiing/mn-starcannon-12b
openrouter:ai21/jamba-1-5-large
openrouter:ai21/jamba-1-5-mini
openrouter:ai21/jamba-1.6-large
openrouter:ai21/jamba-1.6-mini
openrouter:ai21/jamba-instruct
openrouter:aion-labs/aion-1.0
openrouter:aion-labs/aion-1.0-mini
openrouter:aion-labs/aion-rp-llama-3.1-8b
openrouter:all-hands/openhands-lm-32b-v0.1
openrouter:allenai/molmo-7b-d:free
openrouter:allenai/olmo-2-0325-32b-instruct
openrouter:alpindale/goliath-120b
openrouter:alpindale/magnum-72b
openrouter:amazon/nova-lite-v1
openrouter:amazon/nova-micro-v1
openrouter:amazon/nova-pro-v1
openrouter:anthracite-org/magnum-v2-72b
openrouter:anthracite-org/magnum-v4-72b
openrouter:anthropic/claude-2
openrouter:anthropic/claude-2.0
openrouter:anthropic/claude-2.0:beta
openrouter:anthropic/claude-2.1
openrouter:anthropic/claude-2.1:beta
openrouter:anthropic/claude-2:beta
openrouter:anthropic/claude-3-haiku
openrouter:anthropic/claude-3-haiku:beta
openrouter:anthropic/claude-3-opus
openrouter:anthropic/claude-3-opus:beta
openrouter:anthropic/claude-3-sonnet
openrouter:anthropic/claude-3-sonnet:beta
openrouter:anthropic/claude-3.5-haiku
openrouter:anthropic/claude-3.5-haiku-20241022
openrouter:anthropic/claude-3.5-haiku-20241022:beta
openrouter:anthropic/claude-3.5-haiku:beta
openrouter:anthropic/claude-3.5-sonnet
openrouter:anthropic/claude-3.5-sonnet-20240620
openrouter:anthropic/claude-3.5-sonnet-20240620:beta
openrouter:anthropic/claude-3.5-sonnet:beta
openrouter:anthropic/claude-3.7-sonnet
openrouter:anthropic/claude-3.7-sonnet:beta
openrouter:anthropic/claude-3.7-sonnet:thinking
openrouter:bytedance-research/ui-tars-72b:free
openrouter:cognitivecomputations/dolphin-mixtral-8x22b
openrouter:cognitivecomputations/dolphin-mixtral-8x7b
openrouter:cognitivecomputations/dolphin3.0-mistral-24b:free
openrouter:cognitivecomputations/dolphin3.0-r1-mistral-24b:free
openrouter:cohere/command
openrouter:cohere/command-a
openrouter:cohere/command-r
openrouter:cohere/command-r-03-2024
openrouter:cohere/command-r-08-2024
openrouter:cohere/command-r-plus
openrouter:cohere/command-r-plus-04-2024
openrouter:cohere/command-r-plus-08-2024
openrouter:cohere/command-r7b-12-2024
openrouter:deepseek/deepseek-chat
openrouter:deepseek/deepseek-chat-v3-0324
openrouter:deepseek/deepseek-chat-v3-0324:free
openrouter:deepseek/deepseek-chat:free
openrouter:deepseek/deepseek-r1
openrouter:deepseek/deepseek-r1-distill-llama-70b
openrouter:deepseek/deepseek-r1-distill-llama-70b:free
openrouter:deepseek/deepseek-r1-distill-llama-8b
openrouter:deepseek/deepseek-r1-distill-qwen-1.5b
openrouter:deepseek/deepseek-r1-distill-qwen-14b
openrouter:deepseek/deepseek-r1-distill-qwen-14b:free
openrouter:deepseek/deepseek-r1-distill-qwen-32b
openrouter:deepseek/deepseek-r1-distill-qwen-32b:free
openrouter:deepseek/deepseek-r1-zero:free
openrouter:deepseek/deepseek-r1:free
openrouter:deepseek/deepseek-v3-base:free
openrouter:eva-unit-01/eva-llama-3.33-70b
openrouter:eva-unit-01/eva-qwen-2.5-32b
openrouter:eva-unit-01/eva-qwen-2.5-72b
openrouter:featherless/qwerky-72b:free
openrouter:google/gemini-2.0-flash-001
openrouter:google/gemini-2.0-flash-exp:free
openrouter:google/gemini-2.0-flash-lite-001
openrouter:google/gemini-2.0-flash-thinking-exp-1219:free
openrouter:google/gemini-2.0-flash-thinking-exp:free
openrouter:google/gemini-2.5-pro-exp-03-25:free
openrouter:google/gemini-2.5-pro-preview-03-25
openrouter:google/gemini-flash-1.5
openrouter:google/gemini-flash-1.5-8b
openrouter:google/gemini-flash-1.5-8b-exp
openrouter:google/gemini-pro
openrouter:google/gemini-pro-1.5
openrouter:google/gemini-pro-vision
openrouter:google/gemma-2-27b-it
openrouter:google/gemma-2-9b-it
openrouter:google/gemma-2-9b-it:free
openrouter:google/gemma-3-12b-it
openrouter:google/gemma-3-12b-it:free
openrouter:google/gemma-3-1b-it:free
openrouter:google/gemma-3-27b-it
openrouter:google/gemma-3-27b-it:free
openrouter:google/gemma-3-4b-it
openrouter:google/gemma-3-4b-it:free
openrouter:google/learnlm-1.5-pro-experimental:free
openrouter:google/palm-2-chat-bison
openrouter:google/palm-2-chat-bison-32k
openrouter:google/palm-2-codechat-bison
openrouter:google/palm-2-codechat-bison-32k
openrouter:gryphe/mythomax-l2-13b
openrouter:huggingfaceh4/zephyr-7b-beta:free
openrouter:infermatic/mn-inferor-12b
openrouter:inflection/inflection-3-pi
openrouter:inflection/inflection-3-productivity
openrouter:jondurbin/airoboros-l2-70b
openrouter:latitudegames/wayfarer-large-70b-llama-3.3
openrouter:liquid/lfm-3b
openrouter:liquid/lfm-40b
openrouter:liquid/lfm-7b
openrouter:mancer/weaver
openrouter:meta-llama/llama-2-13b-chat
openrouter:meta-llama/llama-2-70b-chat
openrouter:meta-llama/llama-3-70b-instruct
openrouter:meta-llama/llama-3-8b-instruct
openrouter:meta-llama/llama-3.1-405b
openrouter:meta-llama/llama-3.1-405b-instruct
openrouter:meta-llama/llama-3.1-70b-instruct
openrouter:meta-llama/llama-3.1-8b-instruct
openrouter:meta-llama/llama-3.1-8b-instruct:free
openrouter:meta-llama/llama-3.2-11b-vision-instruct
openrouter:meta-llama/llama-3.2-11b-vision-instruct:free
openrouter:meta-llama/llama-3.2-1b-instruct
openrouter:meta-llama/llama-3.2-1b-instruct:free
openrouter:meta-llama/llama-3.2-3b-instruct
openrouter:meta-llama/llama-3.2-3b-instruct:free
openrouter:meta-llama/llama-3.2-90b-vision-instruct
openrouter:meta-llama/llama-3.3-70b-instruct
openrouter:meta-llama/llama-3.3-70b-instruct:free
openrouter:meta-llama/llama-4-maverick
openrouter:meta-llama/llama-4-maverick:free
openrouter:meta-llama/llama-4-scout
openrouter:meta-llama/llama-4-scout:free
openrouter:meta-llama/llama-guard-2-8b
openrouter:meta-llama/llama-guard-3-8b
openrouter:microsoft/phi-3-medium-128k-instruct
openrouter:microsoft/phi-3-mini-128k-instruct
openrouter:microsoft/phi-3.5-mini-128k-instruct
openrouter:microsoft/phi-4
openrouter:microsoft/phi-4-multimodal-instruct
openrouter:microsoft/wizardlm-2-7b
openrouter:microsoft/wizardlm-2-8x22b
openrouter:minimax/minimax-01
openrouter:mistral/ministral-8b
openrouter:mistralai/codestral-2501
openrouter:mistralai/codestral-mamba
openrouter:mistralai/ministral-3b
openrouter:mistralai/ministral-8b
openrouter:mistralai/mistral-7b-instruct
openrouter:mistralai/mistral-7b-instruct-v0.1
openrouter:mistralai/mistral-7b-instruct-v0.2
openrouter:mistralai/mistral-7b-instruct-v0.3
openrouter:mistralai/mistral-7b-instruct:free
openrouter:mistralai/mistral-large
openrouter:mistralai/mistral-large-2407
openrouter:mistralai/mistral-large-2411
openrouter:mistralai/mistral-medium
openrouter:mistralai/mistral-nemo
openrouter:mistralai/mistral-nemo:free
openrouter:mistralai/mistral-saba
openrouter:mistralai/mistral-small
openrouter:mistralai/mistral-small-24b-instruct-2501
openrouter:mistralai/mistral-small-24b-instruct-2501:free
openrouter:mistralai/mistral-small-3.1-24b-instruct
openrouter:mistralai/mistral-small-3.1-24b-instruct:free
openrouter:mistralai/mistral-tiny
openrouter:mistralai/mixtral-8x22b-instruct
openrouter:mistralai/mixtral-8x7b
openrouter:mistralai/mixtral-8x7b-instruct
openrouter:mistralai/pixtral-12b
openrouter:mistralai/pixtral-large-2411
openrouter:moonshotai/moonlight-16b-a3b-instruct:free
openrouter:neversleep/llama-3-lumimaid-70b
openrouter:neversleep/llama-3-lumimaid-8b
openrouter:neversleep/llama-3-lumimaid-8b:extended
openrouter:neversleep/llama-3.1-lumimaid-70b
openrouter:neversleep/llama-3.1-lumimaid-8b
openrouter:neversleep/noromaid-20b
openrouter:nothingiisreal/mn-celeste-12b
openrouter:nousresearch/deephermes-3-llama-3-8b-preview:free
openrouter:nousresearch/hermes-2-pro-llama-3-8b
openrouter:nousresearch/hermes-3-llama-3.1-405b
openrouter:nousresearch/hermes-3-llama-3.1-70b
openrouter:nousresearch/nous-hermes-2-mixtral-8x7b-dpo
openrouter:nousresearch/nous-hermes-llama2-13b
openrouter:nvidia/llama-3.1-nemotron-70b-instruct
openrouter:nvidia/llama-3.1-nemotron-70b-instruct:free
openrouter:nvidia/llama-3.1-nemotron-nano-8b-v1:free
openrouter:nvidia/llama-3.1-nemotron-ultra-253b-v1:free
openrouter:nvidia/llama-3.3-nemotron-super-49b-v1:free
openrouter:open-r1/olympiccoder-32b:free
openrouter:open-r1/olympiccoder-7b:free
openrouter:openai/chatgpt-4o-latest
openrouter:openai/gpt-3.5-turbo
openrouter:openai/gpt-3.5-turbo-0125
openrouter:openai/gpt-3.5-turbo-0613
openrouter:openai/gpt-3.5-turbo-1106
openrouter:openai/gpt-3.5-turbo-16k
openrouter:openai/gpt-3.5-turbo-instruct
openrouter:openai/gpt-4
openrouter:openai/gpt-4-0314
openrouter:openai/gpt-4-1106-preview
openrouter:openai/gpt-4-32k
openrouter:openai/gpt-4-32k-0314
openrouter:openai/gpt-4-turbo
openrouter:openai/gpt-4-turbo-preview
openrouter:openai/gpt-4.5-preview
openrouter:openai/gpt-4o
openrouter:openai/gpt-4o-2024-05-13
openrouter:openai/gpt-4o-2024-08-06
openrouter:openai/gpt-4o-2024-11-20
openrouter:openai/gpt-4o-mini
openrouter:openai/gpt-4o-mini-2024-07-18
openrouter:openai/gpt-4o-mini-search-preview
openrouter:openai/gpt-4o-search-preview
openrouter:openai/gpt-4o:extended
openrouter:openai/o1
openrouter:openai/o1-mini
openrouter:openai/o1-mini-2024-09-12
openrouter:openai/o1-preview
openrouter:openai/o1-preview-2024-09-12
openrouter:openai/o1-pro
openrouter:openai/o3-mini
openrouter:openai/o3-mini-high
openrouter:openchat/openchat-7b
openrouter:openrouter/auto
openrouter:openrouter/quasar-alpha
openrouter:perplexity/llama-3.1-sonar-large-128k-online
openrouter:perplexity/llama-3.1-sonar-small-128k-online
openrouter:perplexity/r1-1776
openrouter:perplexity/sonar
openrouter:perplexity/sonar-deep-research
openrouter:perplexity/sonar-pro
openrouter:perplexity/sonar-reasoning
openrouter:perplexity/sonar-reasoning-pro
openrouter:pygmalionai/mythalion-13b
openrouter:qwen/qwen-2-72b-instruct
openrouter:qwen/qwen-2.5-72b-instruct
openrouter:qwen/qwen-2.5-72b-instruct:free
openrouter:qwen/qwen-2.5-7b-instruct
openrouter:qwen/qwen-2.5-7b-instruct:free
openrouter:qwen/qwen-2.5-coder-32b-instruct
openrouter:qwen/qwen-2.5-coder-32b-instruct:free
openrouter:qwen/qwen-2.5-vl-72b-instruct
openrouter:qwen/qwen-2.5-vl-7b-instruct
openrouter:qwen/qwen-2.5-vl-7b-instruct:free
openrouter:qwen/qwen-max
openrouter:qwen/qwen-plus
openrouter:qwen/qwen-turbo
openrouter:qwen/qwen-vl-max
openrouter:qwen/qwen-vl-plus
openrouter:qwen/qwen2.5-32b-instruct
openrouter:qwen/qwen2.5-vl-32b-instruct
openrouter:qwen/qwen2.5-vl-32b-instruct:free
openrouter:qwen/qwen2.5-vl-3b-instruct:free
openrouter:qwen/qwen2.5-vl-72b-instruct
openrouter:qwen/qwen2.5-vl-72b-instruct:free
openrouter:qwen/qwq-32b
openrouter:qwen/qwq-32b-preview
openrouter:qwen/qwq-32b-preview:free
openrouter:qwen/qwq-32b:free
openrouter:raifle/sorcererlm-8x22b
openrouter:rekaai/reka-flash-3:free
openrouter:sao10k/fimbulvetr-11b-v2
openrouter:sao10k/l3-euryale-70b
openrouter:sao10k/l3-lunaris-8b
openrouter:sao10k/l3.1-70b-hanami-x1
openrouter:sao10k/l3.1-euryale-70b
openrouter:sao10k/l3.3-euryale-70b
openrouter:scb10x/llama3.1-typhoon2-70b-instruct
openrouter:scb10x/llama3.1-typhoon2-8b-instruct
openrouter:sophosympatheia/midnight-rose-70b
openrouter:sophosympatheia/rogue-rose-103b-v0.2:free
openrouter:steelskull/l3.3-electra-r1-70b
openrouter:thedrummer/anubis-pro-105b-v1
openrouter:thedrummer/rocinante-12b
openrouter:thedrummer/skyfall-36b-v2
openrouter:thedrummer/unslopnemo-12b
openrouter:tokyotech-llm/llama-3.1-swallow-70b-instruct-v0.3
openrouter:tokyotech-llm/llama-3.1-swallow-8b-instruct-v0.3
openrouter:undi95/remm-slerp-l2-13b
openrouter:undi95/toppy-m-7b
openrouter:x-ai/grok-2-1212
openrouter:x-ai/grok-2-vision-1212
openrouter:x-ai/grok-beta
openrouter:x-ai/grok-vision-beta
openrouter:xwin-lm/xwin-lm-70b

```

You can find all the models available through Puter [here](https://api.puter.com/puterai/chat/models/).

## Best Practices

When using OpenRouter through Puter.js, keep these best practices in mind:

1. **Choose the right model for your task**: Different models excel at different tasks. Smaller models are faster and more cost-effective for simple queries, while larger models perform better on complex reasoning tasks.

2. **Use streaming for longer responses**: When generating longer content like stories or essays, use streaming to provide a better user experience.

3. **Handle errors gracefully**: Always implement error handling to provide feedback if the API request fails.

4. **Be specific with prompts**: Provide clear and specific instructions to get the best results from the models.


That's it! You now have free, unlimited access to hundreds of AI models through OpenRouter using Puter.js. This allows you to leverage powerful AI capabilities for your applications without worrying about API keys, rate limits, or backend setup.

## Related

- [Free, Unlimited OpenAI API](https://developer.puter.com/tutorials/free-unlimited-openai-api)
- [Free, Unlimited Claude API](https://developer.puter.com/tutorials/free-unlimited-claude-35-sonnet-api)
- [Free, Unlimited Llama API](https://developer.puter.com/tutorials/free-unlimited-llama-api)
- [Free, Unlimited o1-mini API](https://developer.puter.com/tutorials/free-unlimited-o1-mini-api)
- [Free, Unlimited o3-mini API](https://developer.puter.com/tutorials/free-unlimited-o3-mini-api)
- [Free, Unlimited Gemini API](https://developer.puter.com/tutorials/free-gemini-api)

## Ready to Build Your First App?

Start creating powerful web applications with Puter.js today!

[Get Started Now](https://docs.puter.com/getting-started/)

[Read the Docs](https://docs.puter.com/)• [Try the Playground](https://docs.puter.com/playground/)