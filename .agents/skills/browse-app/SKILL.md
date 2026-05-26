---
name: browse-app
description: Helps users browse and interact with the running web application using browser MCP tools. Use when the user says "browse URL", "open localhost", "navigate to localhost", or mentions browsing specific pages in the running web application.
metadata:
  author: Noname
  version: '2.0.0'
---

# Browse App Skill

This skill enables AI-assisted browsing and interaction with the running web application using any available browser MCP tools (e.g., Playwright MCP, Chrome DevTools MCP, or similar).

## When to Use

Use this skill when the user wants to:

- Browse a specific URL in the running web application
- Browse to a page and understand its content
- Interact with UI elements
- Debug or inspect the web application visually

## Instructions

When the user asks to browse a URL (e.g., `Browse http://localhost:5555/#/pitch-detector`), follow these steps.

**If no URL is provided**, default to `http://localhost:5555/`.

### 1. Acknowledge the Web Application is Running

The web application is running at the specified URL.

### 2. Use Browser MCP Tools

Use whichever browser MCP tools are available in the current session to:

- Navigate to the URL
- Interact with page elements
- Extract information from the page
- Take screenshots or snapshots

### 3. Load the Web Application

Use the browser MCP tools to:

1. Navigate to the specified URL
2. Wait for the page to fully load
3. Take a screenshot to show the current state
4. Describe what you see on the page

## Example Prompt Transformation

User says:

> Browse http://localhost:5555/#/pitch-detector

This should be interpreted as:

```
The web application is running at:
http://localhost:5555/#/pitch-detector

Browser MCP tools are available.
Load the web application in the browser and describe what you see.
```

## Browser MCP Capabilities

The exact tool names vary depending on which browser MCP server is connected. Look for tools that provide these capabilities:

- **Navigate** — Open a URL in the browser
- **Screenshot** — Capture a visual image of the current page
- **Snapshot** — Get the page accessibility tree or DOM structure
- **Click** — Click on page elements
- **Fill / Type** — Enter text into form fields
- **Evaluate** — Run JavaScript in the page context

## Tips

- Always wait for the page to fully load after navigation
- Describe the page structure and key elements
- Use screenshots to show the user what you see
- Prefer accessibility snapshots over screenshots when you need to interact with elements
