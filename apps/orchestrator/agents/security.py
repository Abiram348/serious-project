"""
Security agent – analyzes code for security vulnerabilities.

Features:
  1. Deterministic secret detection (regex pre-scan)
  2. Per-category specialized parallel LLM prompts
  3. Confidence scoring + remediation guidance + dedup
  4. Framework-aware pre-reconnaissance
"""

import asyncio
import json
import re
from typing import Any, Dict, List

from .base import BaseAgent

# ── Regex patterns for deterministic secret detection ─────────────────────

SECRET_PATTERNS = [
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
    (r'(?i)aws_secret_access_key\s*[:=]\s*[\'"]([^\'"]+)[\'"]', 'AWS Secret Access Key'),
    (r'ghp_[0-9a-zA-Z]{36}', 'GitHub Personal Access Token'),
    (r'gho_[0-9a-zA-Z]{36}', 'GitHub OAuth Token'),
    (r'sk_live_[0-9a-zA-Z]{24,}', 'Stripe Live Secret Key'),
    (r'sk_test_[0-9a-zA-Z]{24,}', 'Stripe Test Secret Key'),
    (r'rk_live_[0-9a-zA-Z]{24,}', 'Stripe Live Restricted Key'),
    (r'-----BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----', 'Private Key Block'),
    (r'AIza[0-9A-Za-z\-_]{35}', 'Google API Key'),
    (r'xox[baprs]-[0-9a-zA-Z\-]{10,}', 'Slack Token'),
    (r'sq0csp-[0-9A-Za-z\-_]{32,}', 'Square OAuth Secret'),
    (r'(?i)jwt[_\.]?secret\s*[:=]\s*[\'"]([^\'"]{8,})[\'"]', 'JWT Secret in Config'),
    (r'(?i)api[_\.]?key\s*[:=]\s*[\'"]([^\'"]{20,})[\'"]', 'API Key Assignment'),
    (r'(?i)password\s*[:=]\s*[\'"]([^\'"]+)[\'"]', 'Hardcoded Password'),
    (r'(?i)secret\s*[:=]\s*[\'"]([^\'"]{8,})[\'"]', 'Generic Secret Assignment'),
    # Unquoted assignments (env files, shell scripts)
    (r'(?i)^\s*export\s+[A-Z_]+\s*=\s*(sk_live_[0-9a-zA-Z]{24,})', 'Stripe Live Secret Key (unquoted)'),
    (r'(?i)^\s*[A-Z_]+\s*=\s*(sk_live_[0-9a-zA-Z]{24,})', 'Stripe Secret Key (env var)'),
    (r'(?i)^\s*[A-Z_]+\s*=\s*(ghp_[0-9a-zA-Z]{36})', 'GitHub Token (env var)'),
    (r'(?i)^\s*DATABASE_URL\s*=\s*[^\s]+://[^:]+:([^@\s]+)@', 'Database Password in URL'),
]

# ── Per-category specialized prompts ──────────────────────────────────────

CATEGORY_PROMPTS = {
    "sql_injection": """Analyze this code for SQL injection vulnerabilities. Be thorough.

{framework_context}
{code_context}

Focus exclusively on SQL injection:
- String concatenation or interpolation in SQL queries
- Unsanitized user input passed to database queries
- ORM misuse that could lead to injection (raw queries, knex.raw, sequelize.query, prisma.$queryRaw)
- Dynamic query builders without parameterization
- Stored procedure calls with string-built arguments

For each finding assign a confidence score (0-100) based on exploitability certainty.
Provide concrete remediation with a code example.

Output as JSON:
{{
  "findings": [
    {{
      "file": "path/to/file",
      "type": "SQL Injection",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": 85,
      "description": "What and why",
      "remediation": "Fix with code example",
      "line": 42
    }}
  ]
}}""",

    "xss": """Analyze this code for Cross-Site Scripting (XSS) vulnerabilities. Be thorough.

{framework_context}
{code_context}

Focus exclusively on XSS:
- Unescaped user input rendered in HTML/templates
- dangerouslySetInnerHTML in React
- innerHTML, outerHTML, document.write in vanilla JS
- Template engines without auto-escaping
- URL parameters reflected in the DOM
- Stored XSS via database content rendered without sanitization
- SVG/MathML injection vectors
- CSP bypass opportunities

For each finding assign a confidence score (0-100) based on exploitability certainty.
Provide concrete remediation with a code example.

Output as JSON:
{{
  "findings": [
    {{
      "file": "path/to/file",
      "type": "XSS",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": 85,
      "description": "What and why",
      "remediation": "Fix with code example",
      "line": 42
    }}
  ]
}}""",

    "auth": """Analyze this code for authentication and authorization flaws. Be thorough.

{framework_context}
{code_context}

Focus exclusively on auth:
- Missing authentication checks on sensitive endpoints/routes
- Broken access control (horizontal/vertical privilege escalation)
- Weak password policies or missing rate limiting on login
- Session management flaws (insecure cookies, missing HttpOnly/Secure/SameSite)
- JWT misconfigurations (none algorithm, missing signature verification, hardcoded secrets)
- OAuth flow flaws (missing state param, redirect URI validation gaps)
- API endpoints missing authorization middleware
- Direct object reference (IDOR) vulnerabilities

For each finding assign a confidence score (0-100) based on exploitability certainty.
Provide concrete remediation with a code example.

Output as JSON:
{{
  "findings": [
    {{
      "file": "path/to/file",
      "type": "Authentication/Authorization",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": 85,
      "description": "What and why",
      "remediation": "Fix with code example",
      "line": 42
    }}
  ]
}}""",

    "input_validation": """Analyze this code for input validation and injection flaws beyond SQL/XSS. Be thorough.

{framework_context}
{code_context}

Focus on:
- Missing server-side validation (client-only checks)
- Unsafe deserialization of user input (pickle, eval, JSON.parse risks)
- Path traversal via unsanitized file paths from user input
- Command injection via exec/spawn/subprocess/os.system with user input
- Open redirect via unvalidated URL parameters
- File upload without type/size restriction
- Prototype pollution in JavaScript
- Server-Side Request Forgery (SSRF) via user-supplied URLs
- Regular expression denial of service (ReDoS)
- XML External Entity (XXE) injection

For each finding assign a confidence score (0-100) based on exploitability certainty.
Provide concrete remediation with a code example.

Output as JSON:
{{
  "findings": [
    {{
      "file": "path/to/file",
      "type": "Input Validation",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": 85,
      "description": "What and why",
      "remediation": "Fix with code example",
      "line": 42
    }}
  ]
}}""",

    "cors": """Analyze this code for CORS, CSP, and security header/config misconfigurations. Be thorough.

{framework_context}
{code_context}

Focus on:
- Overly permissive CORS (Access-Control-Allow-Origin: * with credentials)
- CORS origin reflection (mirroring the Request Origin header)
- Missing or weak Content-Security-Policy
- Missing security headers (X-Frame-Options, X-Content-Type-Options, HSTS)
- Cookies without Secure/HttpOnly/SameSite flags
- TLS/SSL misconfigurations in code
- WebSocket connections without origin validation
- Exposed server version info or verbose error messages in production
- Debug mode enabled in production config

For each finding assign a confidence score (0-100) based on exploitability certainty.
Provide concrete remediation with a code example.

Output as JSON:
{{
  "findings": [
    {{
      "file": "path/to/file",
      "type": "CORS/Security Misconfiguration",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": 85,
      "description": "What and why",
      "remediation": "Fix with code example",
      "line": 42
    }}
  ]
}}""",

    "crypto": """Analyze this code for cryptographic weaknesses. Be thorough.

{framework_context}
{code_context}

Focus on:
- Weak/deprecated algorithms (MD5, SHA1 for security, DES, RC4, 3DES)
- Hardcoded cryptographic keys, IVs, or salts
- Predictable random number generation (Math.random for tokens/sessions)
- Missing or disabled certificate validation
- ECB mode in block ciphers
- Insufficient key lengths (RSA < 2048, EC < 256)
- Homegrown/hand-rolled cryptography
- Password hashing without bcrypt/argon2/scrypt
- Timing side-channels in secret comparison (== instead of constant-time)

For each finding assign a confidence score (0-100) based on exploitability certainty.
Provide concrete remediation with a code example.

Output as JSON:
{{
  "findings": [
    {{
      "file": "path/to/file",
      "type": "Weak Cryptography",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": 85,
      "description": "What and why",
      "remediation": "Fix with code example",
      "line": 42
    }}
  ]
}}""",

    "dependency": """Analyze this code for dependency and supply-chain risks. Be thorough.

{framework_context}
{code_context}

Focus on:
- Package versions with known published CVEs (check version numbers)
- Unmaintained or deprecated packages
- Overly broad version ranges (>=, *, latest)
- Git/branch-based dependencies without commit pinning
- Typosquatted or suspicious package names
- Unnecessary postinstall scripts or native compilation
- Exposed .npmrc, .pypirc, or registry credentials

For each finding assign a confidence score (0-100) based on certainty.
Provide concrete remediation with a code example.

Output as JSON:
{{
  "findings": [
    {{
      "file": "path/to/file",
      "type": "Dependency/Supply Chain",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": 85,
      "description": "What and why",
      "remediation": "Fix with code example",
      "line": 42
    }}
  ]
}}""",
}

# File extensions to include in code context
CODE_EXTENSIONS = (
    '.ts', '.tsx', '.js', '.jsx', '.py', '.sql',
    '.yaml', '.yml', '.tf', '.sh', '.env',
)

# Max concurrent LLM calls (avoids Anthropic rate limits)
MAX_CONCURRENT_LLM = 3
_llm_semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM)


class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("SECURITY", tier="reasoning")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        project_id = state.get("project_id", "unknown")
        files = state.get("files", {})

        try:
            await self.log(state, "INFO", "Starting security audit")

            # Feature 4: Detect framework for context-aware analysis
            framework_context = self._detect_framework(files)
            if framework_context:
                await self.log(state, "INFO", f"Detected: {framework_context}")

            # Feature 1: Deterministic secret scan (runs before any LLM call)
            secret_findings = self._scan_secrets(files)
            if secret_findings:
                await self.log(state, "INFO", f"Secret scan: {len(secret_findings)} exposure(s)")

            # Build code context
            code_context = self._build_code_context(files)

            # Feature 2: Run all 7 category prompts in parallel (rate-limited)
            if code_context.strip():
                sem = _llm_semaphore
                async def limited_analysis(name, tmpl):
                    async with sem:
                        return await self._run_category_analysis(name, tmpl, code_context, framework_context)

                tasks = [limited_analysis(name, tmpl) for name, tmpl in CATEGORY_PROMPTS.items()]
                category_results = await asyncio.gather(*tasks, return_exceptions=True)
            else:
                await self.log(state, "INFO", "Skipping LLM analysis: no code files found")
                category_results = []

            llm_findings: List[Dict[str, Any]] = []
            category_names = list(CATEGORY_PROMPTS.keys())
            for i, result in enumerate(category_results):
                if isinstance(result, Exception):
                    await self.log(state, "WARNING", f"Category '{category_names[i]}' failed: {result}")
                elif isinstance(result, list):
                    llm_findings.extend(result)

            # Combine deterministic + LLM findings
            all_findings = secret_findings + llm_findings

            # Feature 3: Deduplicate and sort by severity + confidence
            merged = self._merge_findings(all_findings)
            sorted_findings = self._sort_findings(merged)

            security_results = {
                "vulnerabilities": sorted_findings,
                "summary": self._build_summary(sorted_findings, len(secret_findings)),
                "framework": framework_context,
            }

            state.update({
                "security_completed": True,
                "security_results": security_results,
                "security_output": self._format_raw_output(sorted_findings, framework_context),
            })

            vuln_count = len(sorted_findings)
            critical_count = sum(1 for f in sorted_findings if f.get("severity") == "CRITICAL")
            await self.log(state, "INFO", f"Audit complete: {vuln_count} findings ({critical_count} critical)")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Security audit: {vuln_count} findings ({critical_count} critical)",
                "projectId": project_id,
            })

            return state

        except Exception as e:
            state["error"] = str(e)
            await self.log(state, "ERROR", f"Security audit failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Security audit failed: {str(e)}",
                "projectId": project_id,
            })
            return state

    # ── Feature 1: Deterministic secret scanning ──────────────────────────

    def _scan_secrets(self, files: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Pre-scan files for exposed secrets using regex. Runs before LLM calls."""
        findings: List[Dict[str, Any]] = []
        comment_prefixes = ('//', '#', '/*', '*', '<!--', 'REM ', '--')

        for path, file_data in files.items():
            content = file_data.get("content", file_data) if isinstance(file_data, dict) else file_data
            if not isinstance(content, str):
                continue

            lines = content.split('\n')
            for line_num, line in enumerate(lines, start=1):
                stripped = line.strip()
                if not stripped or any(stripped.startswith(prefix) for prefix in comment_prefixes):
                    continue

                for pattern, secret_type in SECRET_PATTERNS:
                    if re.search(pattern, line):
                        findings.append({
                            "file": path,
                            "type": "Exposed Secret",
                            "severity": "CRITICAL",
                            "confidence": 100,
                            "description": (
                                f"{secret_type} found in source code. Secrets committed to version "
                                "control can be leaked through git history, logs, error traces, "
                                "or client-side bundles."
                            ),
                            "remediation": (
                                f"Remove this {secret_type} immediately. Use environment variables "
                                "or a secrets manager (AWS Secrets Manager, Vault, Doppler). For "
                                "local development, use .env files excluded from version control. "
                                "Rotate this secret if it has been pushed to any remote."
                            ),
                            "line": line_num,
                            "detection_method": "regex",
                        })
                        break

        return findings

    # ── Feature 2: Per-category parallel LLM analysis ─────────────────────

    async def _run_category_analysis(
        self, category: str, template: str, code_context: str, framework_context: str,
    ) -> List[Dict[str, Any]]:
        """Run one category's specialized prompt and parse findings."""
        framework_block = f"Tech stack: {framework_context}\n" if framework_context else ""
        prompt = template.format(
            code_context=code_context,
            framework_context=framework_block,
        )
        response = await self.call_llm(prompt, max_tokens=4096)
        parsed = self._parse_json_from_response(response)

        if not parsed or "findings" not in parsed:
            return []

        findings: List[Dict[str, Any]] = []
        for f in parsed["findings"]:
            desc = f.get("description", "")
            if not desc:
                continue
            findings.append({
                "file": f.get("file", "unknown"),
                "type": f.get("type", category.replace("_", " ").title()),
                "severity": self._normalize_severity(f.get("severity", "MEDIUM")),
                "confidence": self._clamp_confidence(f.get("confidence", 50)),
                "description": desc,
                "remediation": f.get("remediation", "Manual review required."),
                "line": f.get("line"),
                "category": category,
                "detection_method": "llm",
            })

        return findings

    @staticmethod
    def _clamp_confidence(value: Any) -> int:
        try:
            return max(0, min(100, int(value)))
        except (ValueError, TypeError):
            return 50

    @staticmethod
    def _normalize_severity(severity: str) -> str:
        sev = severity.upper().strip()
        if sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
            return sev
        return "MEDIUM"

    # ── Feature 3: Dedup, sort, and summarize ─────────────────────────────

    def _merge_findings(self, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate findings by file + type + line proximity (within 5 lines)."""
        merged: List[Dict[str, Any]] = []
        seen: set = set()

        for finding in findings:
            line = finding.get("line") or 0
            bucket = line // 5 if line else -1
            key = (finding.get("file"), finding.get("type"), bucket)

            if key in seen:
                for existing in merged:
                    ex_line = existing.get("line") or 0
                    ex_bucket = ex_line // 5 if ex_line else -1
                    ex_key = (existing.get("file"), existing.get("type"), ex_bucket)
                    if ex_key == key and finding.get("confidence", 0) > existing.get("confidence", 0):
                        existing.update(finding)
                    break
            else:
                seen.add(key)
                merged.append(finding)

        return merged

    def _sort_findings(self, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        return sorted(
            findings,
            key=lambda f: (
                severity_order.get(f.get("severity", "LOW"), 4),
                -f.get("confidence", 0),
            ),
        )

    def _build_summary(self, findings: List[Dict[str, Any]], regex_count: int) -> Dict[str, Any]:
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        type_counts: Dict[str, int] = {}

        for f in findings:
            sev = f.get("severity", "LOW")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            ftype = f.get("type", "Unknown")
            type_counts[ftype] = type_counts.get(ftype, 0) + 1

        return {
            "total_findings": len(findings),
            "by_severity": severity_counts,
            "by_type": type_counts,
            "regex_detected_secrets": regex_count,
        }

    def _format_raw_output(self, findings: List[Dict[str, Any]], framework: str) -> str:
        lines = ["=== Security Audit Results ==="]
        if framework:
            lines.append(f"Stack: {framework}")
        lines.append(f"Total findings: {len(findings)}")

        current_sev = None
        for f in findings:
            sev = f.get("severity", "LOW")
            if sev != current_sev:
                current_sev = sev
                lines.append(f"\n-- {sev} --")

            loc = f" (line {f['line']})" if f.get("line") else ""
            conf = f.get("confidence", "?")
            lines.append(f"\n[{f['type']}] {f['file']}{loc} - confidence {conf}%")
            lines.append(f"  {f['description']}")
            lines.append(f"  Fix: {f['remediation']}")

        return '\n'.join(lines)

    # ── Feature 4: Framework-aware pre-reconnaissance ──────────────────────

    def _detect_framework(self, files: Dict[str, Any]) -> str:
        contexts: List[str] = []

        for path, file_data in files.items():
            content = file_data.get("content", file_data) if isinstance(file_data, dict) else file_data
            if not isinstance(content, str):
                continue

            file_name = path.split('/')[-1].lower()

            if file_name == 'package.json':
                ctx = self._detect_from_package_json(content)
                if ctx:
                    contexts.extend(ctx)

            elif file_name in ('requirements.txt', 'pyproject.toml', 'pipfile'):
                ctx = self._detect_from_python_deps(content)
                if ctx:
                    contexts.extend(ctx)

        return '; '.join(contexts) if contexts else ""

    @staticmethod
    def _detect_from_package_json(content: str) -> List[str]:
        contexts: List[str] = []
        try:
            pkg = json.loads(content)
            all_deps = {
                k.lower(): k
                for k in (
                    list(pkg.get("dependencies", {}).keys())
                    + list(pkg.get("devDependencies", {}).keys())
                )
            }

            framework_map = {
                "next": "Next.js", "react": "React", "vue": "Vue.js",
                "angular": "@angular/core", "svelte": "Svelte", "express": "Express.js",
                "fastify": "Fastify", "koa": "Koa", "nest": "@nestjs/core",
                "nuxt": "Nuxt.js", "remix": "Remix", "astro": "Astro",
            }
            detected = [name for key, name in framework_map.items() if key in all_deps]
            if detected:
                contexts.append(f"Frameworks: {', '.join(detected)}")

            orm_map = {
                "prisma": "Prisma", "@prisma/client": "Prisma", "typeorm": "TypeORM",
                "sequelize": "Sequelize", "knex": "Knex.js", "drizzle-orm": "Drizzle",
                "mongoose": "Mongoose",
            }
            detected_orms = [name for key, name in orm_map.items() if key in all_deps]
            if detected_orms:
                contexts.append(f"ORM/DB: {', '.join(dict.fromkeys(detected_orms))}")

            auth_map = {
                "next-auth": "NextAuth.js", "passport": "Passport.js",
                "bcrypt": "bcrypt", "jsonwebtoken": "JWT",
                "jose": "JWT", "lucia-auth": "Lucia Auth",
            }
            detected_auth = [name for key, name in auth_map.items() if key in all_deps]
            if detected_auth:
                contexts.append(f"Auth: {', '.join(detected_auth)}")

            contexts.append("Language: TypeScript" if "typescript" in all_deps else "Language: JavaScript")

        except (json.JSONDecodeError, TypeError):
            pass
        return contexts

    @staticmethod
    def _detect_from_python_deps(content: str) -> List[str]:
        contexts: List[str] = []
        content_lower = content.lower()

        # Extract package names from dependency lines
        # Handles: "django==4.0", "django>=4.0,<5.0", "django", 'django = "^4.0"'
        pkg_names = set()
        for line in content_lower.split('\n'):
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('['):
                continue
            # Strip version specifiers and quotes
            pkg = re.split(r'[=<>~!\[\s"\']', line)[0].strip()
            if pkg and not pkg.startswith('-'):
                pkg_names.add(pkg)

        py_frameworks = {
            "django": "Django", "fastapi": "FastAPI", "flask": "Flask",
            "starlette": "Starlette", "aiohttp": "aiohttp", "sanic": "Sanic",
            "litestar": "Litestar", "pyramid": "Pyramid",
        }
        detected = [name for key, name in py_frameworks.items() if key in pkg_names]
        if detected:
            contexts.append(f"Frameworks: {', '.join(detected)}")

        py_orms = {
            "sqlalchemy": "SQLAlchemy", "peewee": "Peewee",
            "tortoise-orm": "Tortoise ORM", "pony": "Pony ORM",
        }
        detected_orms = [name for key, name in py_orms.items() if key in pkg_names]
        if detected_orms:
            contexts.append(f"ORM/DB: {', '.join(detected_orms)}")

        py_auth = {
            "python-jose": "python-jose", "pyjwt": "PyJWT",
            "passlib": "passlib", "bcrypt": "bcrypt",
        }
        detected_auth = [name for key, name in py_auth.items() if key in pkg_names]
        if detected_auth:
            contexts.append(f"Auth: {', '.join(detected_auth)}")

        return contexts

    # ── Code context builder (expanded file coverage) ─────────────────────

    def _build_code_context(self, files: Dict[str, Any]) -> str:
        context_parts: List[str] = []
        for path, file_data in files.items():
            ext = '.' + path.rsplit('.', 1)[-1].lower() if '.' in path else ''
            if ext in CODE_EXTENSIONS or path.lower().endswith('dockerfile'):
                content = file_data.get("content", file_data) if isinstance(file_data, dict) else file_data
                context_parts.append(f"## {path}\n{content[:4000]}")
        return "\n\n".join(context_parts)
