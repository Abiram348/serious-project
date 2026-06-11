# INVESTIGATION REPORT

## 1. API Build Fails — TypeScript Compilation Errors (2 errors)
- `TS7016: Could not find a declaration file for module 'cors'`
- `TS7017: Element implicitly has an 'any' type because type 'typeof globalThis' has no index signature`

## 2. API Tests Fail — Jest Cannot Parse ESM Dependencies (2 test suites)
- `SyntaxError: Cannot use import statement outside a module` from `chalk/source/index.js` inside `e2b`

## 3. API Lint Fails — Missing ESLint Config
- `ESLint couldn't find a configuration file`

## 4. Web Lint Fails — Missing ESLint Config
- Next.js prompts for ESLint setup on `pnpm lint`

## 5. Orchestrator Tests Fail — Python Assertion Mismatches (2 failures)
- `test_main.py`: Asserts `"workflow_result" in data` but endpoint returns `{project_id, status, message}`
- `test_graph.py`: Asserts 8 completion flags but graph runs real LLM calls non-deterministically

## 6. Pipeline Status Not Updating in Database
- Orchestrator `_run_pipeline` never calls back to API to update `Project.status` after completion
