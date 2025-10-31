from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI

from google.adk.agents import Agent
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.sessions import DatabaseSessionService
from ag_ui.core import RunAgentInput

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint

def get_items() -> list:
    """Returns a list of available items."""
    mocked_items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']
    return mocked_items

root_agent = Agent(
    name="GenericAgent",
    model="gemini-2.5-flash",
    instruction="""
        You are a helpful assistant that provides information about available items.
        ALWAYS Wait for the user to ask for the list of items before providing it.

        ## USER CONTEXT:
        - User name: "{user_name}"
    """,
    tools=[get_items]
)

DATABASE_SERVICE_URI = "sqlite:///./sessions.db"

# Define custom extractor that uses state
def user_id_extractor(input: RunAgentInput) -> str:
    if hasattr(input.state, 'get') and input.state.get("user_id"):
        return input.state["user_id"]
    return "anonymous"

# Create ADK middleware agent instance
adk_agent = ADKAgent(
    adk_agent=root_agent,
    app_name="agent",
    user_id_extractor=user_id_extractor,
    session_timeout_seconds=3600,
    session_service=DatabaseSessionService(DATABASE_SERVICE_URI),
)

# Create the FastAPI app using ADK's helper to get all original SDK routes
app: FastAPI = get_fast_api_app(
    agents_dir="../",
    session_service_uri=DATABASE_SERVICE_URI,
    web=True,
)

# Add the ADK endpoint
add_adk_fastapi_endpoint(app, adk_agent, path="/ag-ui")

if __name__ == "__main__":
    import os
    import uvicorn

    if not os.getenv("GOOGLE_API_KEY"):
        print("⚠️  Warning: GOOGLE_API_KEY environment variable not set!")
        print("   Set it with: export GOOGLE_API_KEY='your-key-here'")
        print("   Get a key from: https://makersuite.google.com/app/apikey")
        print()

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
