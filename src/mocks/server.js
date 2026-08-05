import { setupServer } from "msw/node";

// Shared MSW server — import and add handlers in each test file as needed.
export const server = setupServer();
