@ChurchComm-main/prd.md @activity.md

We are building the ChurchComm AI V2 platform according to the PRD in this repo.

First read activity.md to see what was recently accomplished.

## Project Context

This is a React + Vite + Supabase church management SaaS app. The source code is in the `ChurchComm-main/` subdirectory.

- Frontend: React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- Backend: Supabase Edge Functions (Deno runtime)
- State: Zustand (auth) + TanStack React Query (server state)
- Database: Supabase PostgreSQL with RLS + pgvector
- Voice AI: VAPI + 11Labs
- SMS: Twilio
- Email: Resend

## Start the Application

```bash
cd ChurchComm-main && npm run dev
```

The dev server runs on **http://localhost:8080**.

If the port is taken, the next available port will be used automatically.

## Work on Tasks

Open ChurchComm-main/prd.md and find the **JSON Task List** section at the bottom. Find the single highest priority task where `"passes": false`.

Work on exactly ONE task:
1. Read the task's description and steps carefully
2. Implement the change according to the task steps
3. All frontend code lives in `ChurchComm-main/src/`
4. All edge functions live in `ChurchComm-main/supabase/functions/`
5. Run checks after implementation:
   ```bash
   cd ChurchComm-main && npm run build
   cd ChurchComm-main && npm run lint
   ```

## Verify in Browser

After implementing, use agent-browser to verify your work:

1. Open the local server URL:
   ```
   agent-browser open http://localhost:8080
   ```

2. Take a snapshot to see the page structure:
   ```
   agent-browser snapshot -i -c
   ```

3. Take a screenshot for visual verification:
   ```
   agent-browser screenshot screenshots/[task-name].png
   ```

4. Check for any console errors or layout issues

5. If the task involves interactive elements, test them:
   ```
   agent-browser click "[selector]"
   agent-browser fill "[selector]" "test value"
   ```

## Log Progress

Append a dated progress entry to activity.md describing:
- What you changed
- What commands you ran
- The screenshot filename
- Any issues encountered and how you resolved them

## Update Task Status

When the task is confirmed working, update that task's `"passes"` field in ChurchComm-main/prd.md from `false` to `true`.

## Commit Changes

Make one git commit for that task only with a clear, descriptive message:
```
git add .
git commit -m "feat: [brief description of what was implemented]"
```

Do NOT run `git init`, do NOT change git remotes, and do NOT push.

## Important Rules

- ONLY work on a SINGLE task per iteration
- Always verify in browser before marking a task as passing
- Always log your progress in activity.md
- Always commit after completing a task
- Use the `@` path alias for imports (maps to `./src`)
- Follow existing patterns in the codebase (shadcn/ui, Zustand, TanStack Query)
- All Supabase queries must include `organization_id` for RLS
- Edge functions use Deno runtime (import from "jsr:@supabase/functions-js/edge-runtime.d.ts")

## Completion

When ALL tasks have `"passes": true`, output:

<promise>COMPLETE</promise>
