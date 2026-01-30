---
name: api-expert
description: Expert in Google Cloud and Saxo Bank APIs.
---

# Expert Knowledge Base
## Saxo Bank
- Use OpenAPI/Swagger specs.
- Auth: Reference `https://www.developer.saxo/openapi/learn/auth`.
- Prioritize WebSocket subscriptions for price data.

## Google Cloud
- Identity: Always use the `mimu@mimu.dev` project context.
- Library: Default to `google-auth` for all service interactions.

## MCP Protocol
- Ensure all new API tools are mapped in the central `mcp_config.json`.