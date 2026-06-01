"""
Sandbox tools for SwarmDev agents.
Provides E2B sandbox integration for code execution.
"""

import os
from typing import Optional, Dict, Any
from e2b_code_interpreter import Sandbox

class SandboxTools:
    """Tools for interacting with E2B sandboxes."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("E2B_API_KEY")
        self.sandbox: Optional[Sandbox] = None

    async def create_sandbox(self, project_id: str) -> Sandbox:
        """Create a new sandbox for a project."""
        if not self.api_key:
            raise ValueError("E2B API key not configured")

        self.sandbox = Sandbox(api_key=self.api_key)
        return self.sandbox

    async def close_sandbox(self):
        """Close the current sandbox."""
        if self.sandbox:
            await self.sandbox.close()
            self.sandbox = None

    async def write_file(self, path: str, content: str) -> bool:
        """Write a file to the sandbox filesystem."""
        if not self.sandbox:
            raise RuntimeError("Sandbox not initialized")

        try:
            await self.sandbox.files.write(path, content)
            return True
        except Exception as e:
            print(f"Error writing file: {e}")
            return False

    async def read_file(self, path: str) -> Optional[str]:
        """Read a file from the sandbox filesystem."""
        if not self.sandbox:
            raise RuntimeError("Sandbox not initialized")

        try:
            return await self.sandbox.files.read(path)
        except Exception as e:
            print(f"Error reading file: {e}")
            return None

    async def run_command(self, command: str, timeout: int = 60) -> Dict[str, Any]:
        """Run a command in the sandbox."""
        if not self.sandbox:
            raise RuntimeError("Sandbox not initialized")

        try:
            result = await self.sandbox.commands.run(command, timeout=timeout)
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.exit_code,
            }
        except Exception as e:
            return {
                "error": str(e),
                "exit_code": -1,
            }

    async def install_packages(self, packages: list, package_manager: str = "npm") -> Dict[str, Any]:
        """Install packages in the sandbox."""
        if package_manager == "npm":
            return await self.run_command(f"npm install {' '.join(packages)}")
        elif package_manager == "pip":
            return await self.run_command(f"pip install {' '.join(packages)}")
        else:
            return {"error": f"Unknown package manager: {package_manager}"}
