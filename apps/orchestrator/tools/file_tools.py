"""
File tools for SwarmDev agents.
Provides file manipulation utilities.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any

class FileTools:
    """Tools for file operations."""

    @staticmethod
    def parse_files_from_response(response: str) -> Dict[str, str]:
        """Parse generated files from LLM response.

        Expected format:
        FILE: path/to/file.ts
        [file content]

        FILE: path/to/file2.ts
        [file content]
        """
        files = {}
        lines = response.split('\n')
        current_file = None
        current_content = []

        for line in lines:
            if line.startswith('FILE: '):
                if current_file:
                    files[current_file] = '\n'.join(current_content)
                current_file = line.replace('FILE: ', '').strip()
                current_content = []
            elif current_file:
                current_content.append(line)

        if current_file:
            files[current_file] = '\n'.join(current_content)

        return files

    @staticmethod
    def get_language_from_path(path: str) -> str:
        """Determine language from file path."""
        ext = Path(path).suffix.lower().lstrip('.')
        lang_map = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'py': 'python',
            'rs': 'rust',
            'go': 'go',
            'java': 'java',
            'rb': 'ruby',
            'sql': 'sql',
            'md': 'markdown',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sh': 'bash',
        }
        return lang_map.get(ext, 'text')

    @staticmethod
    def validate_file_path(path: str) -> bool:
        """Validate that a file path is safe and valid."""
        # Prevent path traversal
        if '..' in path:
            return False

        # Prevent absolute paths
        if path.startswith('/'):
            return False

        # Check for valid characters
        invalid_chars = ['<', '>', ':', '"', '|', '?', '*']
        if any(char in path for char in invalid_chars):
            return False

        return True

    @staticmethod
    def generate_file_tree(files: Dict[str, str]) -> str:
        """Generate a visual file tree from file paths."""
        tree = {}

        for path in files.keys():
            parts = path.split('/')
            current = tree
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
            current[parts[-1]] = None

        def render_tree(node: Dict, prefix: str = '') -> str:
            result = []
            for name, children in sorted(node.items()):
                result.append(f"{prefix}📄 {name}" if children is None else f"{prefix}📁 {name}")
                if children:
                    result.append(render_tree(children, prefix + '  '))
            return '\n'.join(result)

        return render_tree(tree)
