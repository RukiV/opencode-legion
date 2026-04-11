# arise_list_models

List all available models from configured providers.

## Usage

```
arise_list_models
```

## Arguments

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| `provider`| string | No       | Filter by provider name        |

## Response Format

```typescript
{
  // Provider name
  provider-id: 
    - model-id (context)
    - model-id (context)
  
  // Next provider...
}
```

## Example Response

```
## Available Models Summary

| Provider | Notable Models | Context |
|----------|---------------|---------|
| **opencode** | `big-pickle` (current), `gpt-5.4`, `claude-opus-4-6`, `gemini-3.1-pro` | up to 1M |
| **openrouter** | DeepSeek, Qwen, Gemini, Grok, Mistral, Llama, etc. | up to 2M |
| **ollama-cloud** | DeepSeek-V3.2, Qwen3, Kimi-K2, Gemma3, Mistral-Large-3 | up to 262K |

### Popular Free Options
- `openrouter/deepseek/deepseek-r1:free` (164K)
- `openrouter/google/gemini-2.0-flash-exp:free` (1M)
- `openrouter/qwen/qwen3-32b:free` (41K)
- `openrouter/meta-llama/llama-3.3-70b-instruct:free` (131K)

### Top Tier (Paid)
- `opencode/gpt-5.4-pro` / `opencode/claude-opus-4-6` (1M context)
- `openrouter/x-ai/grok-4` / `grok-4.1-fast` (2M context)
```

## Cache Behavior

Results are cached for efficiency. Use `provider` argument to filter and reduce output.

## Use Cases

- Check available models before invoking a shadow with specific model
- Filter by provider: `arise_list_models provider=openrouter`
- Find free tier models for cost-effective operations

## See Also

- [arise_summon](../tools/arise_summon.md) - Invoke a shadow with specific model
- [arise_background](../tools/arise_background.md) - Launch parallel background task
