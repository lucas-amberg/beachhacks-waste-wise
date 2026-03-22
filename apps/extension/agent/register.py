"""Register the WasteWise agent on Agentverse.

Usage:
  AGENTVERSE_KEY=<your-api-key> AGENT_ENDPOINT=<public-url> python register.py

Prerequisites:
  pip install uagents-core
"""

import os
import sys

AGENTVERSE_KEY = os.environ.get("AGENTVERSE_KEY", "")
AGENT_ENDPOINT = os.environ.get("AGENT_ENDPOINT", "")
AGENT_SEED = os.environ.get("AGENT_SEED_PHRASE", "wastewise sustainability scoring agent v1")

if not AGENTVERSE_KEY:
    print("Error: Set AGENTVERSE_KEY environment variable")
    sys.exit(1)

if not AGENT_ENDPOINT:
    print("Error: Set AGENT_ENDPOINT environment variable (your public URL, e.g. https://xxx.trycloudflare.com)")
    sys.exit(1)


def main():
    try:
        from uagents_core.utils.registration import (
            register_chat_agent,
            RegistrationRequestCredentials,
        )
    except ImportError:
        print("Installing uagents-core...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "uagents-core"])
        from uagents_core.utils.registration import (
            register_chat_agent,
            RegistrationRequestCredentials,
        )

    print(f"Registering WasteWise agent at: {AGENT_ENDPOINT}")
    print(f"Using seed phrase: {AGENT_SEED[:20]}...")

    register_chat_agent(
        "WasteWise Sustainability Agent",
        AGENT_ENDPOINT,
        active=True,
        credentials=RegistrationRequestCredentials(
            agentverse_api_key=AGENTVERSE_KEY,
            agent_seed_phrase=AGENT_SEED,
        ),
    )

    print("Registration successful! Check https://agentverse.ai to verify.")


if __name__ == "__main__":
    main()
