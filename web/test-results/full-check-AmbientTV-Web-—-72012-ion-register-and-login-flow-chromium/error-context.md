# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-check.spec.js >> AmbientTV Web — Full Integration >> register and login flow
- Location: tests/full-check.spec.js:33:3

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED ::1:3000
Call log:
  - → POST http://localhost:3000/api/auth/register
    - user-agent: Playwright/1.60.0 (x64; ubuntu 24.04) node/24.15
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 86

```