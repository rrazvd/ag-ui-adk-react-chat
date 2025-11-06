const {
  VITE_AG_UI_URL = "http://localhost:8000/ag-ui",
  VITE_INITIAL_STATE = '{"user_id":"user-123","user_name":"Joe Doe"}'
} = import.meta.env;

let parsedInitialState
try {
  parsedInitialState = JSON.parse(VITE_INITIAL_STATE);
} catch (error) {
  console.error('Failed to parse VITE_INITIAL_STATE, verify if a valid JSON was provided.', error);
}

const AGENT_INITIAL_STATE = parsedInitialState || {}

export {
  VITE_AG_UI_URL as AG_UI_URL,
  AGENT_INITIAL_STATE
}