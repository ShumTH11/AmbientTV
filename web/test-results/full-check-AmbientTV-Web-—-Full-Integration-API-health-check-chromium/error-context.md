# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-check.spec.js >> AmbientTV Web — Full Integration >> API health check
- Location: tests/full-check.spec.js:19:3

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:3000
Call log:
  - → GET http://localhost:3000/api/health
    - user-agent: Playwright/1.60.0 (x64; ubuntu 24.04) node/24.15
    - accept: */*
    - accept-encoding: gzip,deflate,br

```