import httpx
from typing import Any
from pydantic import BaseModel, Field
from apps.api.core.config import settings

class ChatMessage(BaseModel):
    role: str
    content: str

class LatentStackRequest(BaseModel):
    model: str = Field(default_factory=lambda: settings.LATENTSTACK_PRIMARY_MODEL)
    messages: list[ChatMessage]
    temperature: float = 0.2
    max_tokens: int | None = 1000

class LatentStackResponse(BaseModel):
    id: str | None = None
    model: str
    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0

class LatentStackClientError(Exception):
    """Base exception for LatentStack API client errors."""
    pass

class LatentStackClient:
    """Client for routing AI requests through LatentStack API (/v1/chat/completions)."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None
    ) -> None:
        self.base_url = (base_url or settings.LATENTSTACK_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.LATENTSTACK_API_KEY
        self.timeout = timeout or settings.LATENTSTACK_TIMEOUT_SECONDS

    async def completion(self, request: LatentStackRequest) -> LatentStackResponse:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = request.model_dump(exclude_none=True)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                choice = data["choices"][0]
                content = choice["message"]["content"]
                usage = data.get("usage", {})

                return LatentStackResponse(
                    id=data.get("id"),
                    model=data.get("model", request.model),
                    content=content,
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0)
                )
            except httpx.TimeoutException as exc:
                raise LatentStackClientError(f"LatentStack request timed out after {self.timeout}s") from exc
            except httpx.HTTPStatusError as exc:
                raise LatentStackClientError(f"LatentStack API returned status {exc.response.status_code}: {exc.response.text}") from exc
            except Exception as exc:
                raise LatentStackClientError(f"LatentStack request failed: {str(exc)}") from exc


class AIService:
    """Domain service abstracting AI capabilities via LatentStackClient."""

    def __init__(self, client: LatentStackClient | None = None) -> None:
        self.client = client or LatentStackClient()

    async def execute_prompt(self, system_prompt: str, user_prompt: str, model: str | None = None) -> LatentStackResponse:
        request = LatentStackRequest(
            model=model or settings.LATENTSTACK_PRIMARY_MODEL,
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt)
            ]
        )
        return await self.client.completion(request)
