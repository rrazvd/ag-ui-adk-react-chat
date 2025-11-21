import React, { useState, useEffect, useRef } from 'react';

import { HttpAgent, type AgentStateMutation } from '@ag-ui/client';

import type { 
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  StateSnapshotEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  SystemMessage,
  UserMessage, 
  ToolMessage, 
  Tool
} from '@ag-ui/core';

import { ItemsList } from '../../components';

import { AG_UI_URL, AGENT_INITIAL_STATE } from '../../settings';
import { getQueryParam, updateUrlQueryParam, parseJsonQueryParam } from '../../utils';

import './playground.css';

const SYSTEM_MESSAGE: SystemMessage = {
  id: `system-${Date.now()}`,
  role: 'system',
  content: `
    CRITICAL RENDERING RULES - MUST FOLLOW:

    1. NEVER list items as plain text. You MUST use the render_ItemsList tool for ANY list of items.

    2. When you have multiple items to show (products, articles, locations, etc.), follow this EXACT sequence:
       - First: Send a brief text message explaining what you're about to show
       - Second: IMMEDIATELY call render_ItemsList with the items array
       - Do NOT include the items in your text response

    3. FORBIDDEN: Writing items like "1. Item A, 2. Item B", "- Item A - Item B" or "Item A, Item B, Item C" in text

    4. REQUIRED: Use render_ItemsList for ANY collection of 2 or more named items

    5. CORRECT Examples:

       Example A - Fruits:
       User: "Show me some fruits"
       Assistant: "Here are some popular fruits:"
       Assistant: [CALLS render_ItemsList with ["Apple", "Banana", "Orange"]]

       Example B - Colors:
       User: "What are the available colors?"
       Assistant: "Here are the current available colors:"
       Assistant: [CALLS render_ItemsList with ["Red", "Green", "Blue", "Yellow"]]

       Example C - Products:
       User: "Show me smartphones"
       Assistant: "Here are the available smartphones:"
       Assistant: [CALLS render_ItemsList with ["iPhone 15", "Samsung Galaxy S24", "Google Pixel 8"]]

    6. INCORRECT Examples (DO NOT DO THIS):
       "Available colors: 1. Red, 2. Green, 3. Blue"
       "The colors are: Red, Green, and Blue"
       "• Red • Green • Blue"

    7. After user selects an item from the visual list, provide detailed information about that specific item.

    8. COMMON USE CASES that REQUIRE render_ItemsList:
       - "What colors are available?" → Show colors names
       - "List the products" → Show product names
       - "Show me options" → Show option names
       - "What can I choose from?" → Show available choices
       - Any question asking for multiple named items

    Remember: Visual presentation using tools is MANDATORY, not optional. Text lists are strictly prohibited.
  `
}

const TOOLS: Tool[] = [
  {
    name: "render_ItemsList",
    description: "Renders a visual, interactive list of items in a horizontal scrollable carousel format. Use this tool to display any collection of named items such as products, locations, categories, options, or any other entities that the user can select from. This tool creates a better user experience than displaying items as plain text.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "string",
            description: "The display name of each item in the list. Each string should be a clear, user-friendly name that represents a selectable option."
          },
          description: "An array of item names to be displayed in the visual list. Must contain at least 2 items. Each item will be rendered as a clickable element that users can interact with to make selections.",
          minItems: 2
        }
      },
      required: ["items"]
    }
  }
];

interface UIMessage {
  id: string;
  text?: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'items';
  items?: string[];
}

export const Playground: React.FC = () => {
  const initialQueryParams = {
    target: getQueryParam('target'),
    state: getQueryParam('state'),
    thread: getQueryParam('thread')
  };
  
  const initialAgentUrl = initialQueryParams.target || AG_UI_URL;
  const initialAgentState = parseJsonQueryParam(initialQueryParams.state, AGENT_INITIAL_STATE);
  const initialThreadId = initialQueryParams.thread;
  
  const [agentUrl, setAgentUrl] = useState(initialAgentUrl);
  const [agent, setAgent] = useState<HttpAgent | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stateTextarea, setStateTextarea] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {    
    const agent = createAgent({
      url: agentUrl,
      state: initialAgentState,
      threadId: initialThreadId || undefined
    });
    setAgent(agent);

    updateUrlQueryParam('target', initialAgentUrl, !!initialQueryParams.target);
    updateUrlQueryParam('state', JSON.stringify(initialAgentState), !!initialQueryParams.state);
    updateThreadIdUrl(agent.threadId);
  }, []);

  const createAgent = ({url, state, threadId} : {url: string, state: object, threadId?: string}) => {
    const agent = new HttpAgent({
      url,
      threadId,
      initialState: state,
      initialMessages: [SYSTEM_MESSAGE]
    })
    console.log('Current thread id: ', agent.threadId)
    return agent;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading])

  useEffect(() => {
    if (agent) setStateTextarea(JSON.stringify(agent.state, null, 2));
  }, [agent]);

  const updateAgentStateUrl = (stateValue: string) => {
    const shouldPreserve = !!initialQueryParams.state || stateValue !== JSON.stringify(AGENT_INITIAL_STATE);
    updateUrlQueryParam('state', stateValue, shouldPreserve);
  };

  const updateThreadIdUrl = (threadId: string) => {
    updateUrlQueryParam('thread', threadId, true);
  };

  const onUpdateStateClick = () => {
    if (!agent) return;
    
    try {
      const newState = JSON.parse(stateTextarea);
      agent.state = newState;
      updateAgentStateUrl(stateTextarea);
      console.log('Agent state updated:', agent.state);
    } catch (error) {
      console.error('Error parsing JSON state:', error);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !agent || isLoading) return;

    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {      
      agent.addMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText
      } as UserMessage);

      if (Object.keys(agent.state).includes('user_current_time')){
        agent.state['user_current_time'] = new Date().toString();
      }

      console.log('Agent messages before run:', agent.messages);
      console.log('Agent state before run:', agent.state);

      const result = await agent.runAgent({
        tools: TOOLS
      }, {
        onTextMessageStartEvent: (params: { event: TextMessageStartEvent }) => {
          const newMessage: UIMessage = {
            id: params.event.messageId,
            text: '',
            sender: 'agent',
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, newMessage]);
        },

        onTextMessageContentEvent: (params: { event: TextMessageContentEvent }) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === params.event.messageId 
                ? { ...msg, text: (msg.text || '') + params.event.delta }
                : msg
            )
          );
        },

        onToolCallStartEvent: (params: { event: ToolCallStartEvent }) => {
          console.log('Tool call started:', params.event);
        },

        onToolCallArgsEvent: (params: { event: ToolCallArgsEvent }) => {
          console.log('Tool call args:', params.event);
        },

        onStateSnapshotEvent: (params: { event: StateSnapshotEvent }) => {
          console.log('Agent state snapshot:', params.event);
          setStateTextarea(JSON.stringify(params.event.snapshot, null, 2));
        },

        onToolCallEndEvent: (params: { event: ToolCallEndEvent; toolCallName: string; toolCallArgs: any; messages: any[]; }): AgentStateMutation | void => {
          console.log('Tool call ended:', params.event, params.toolCallArgs, params.toolCallName);
          const {toolCallName, toolCallArgs, event: { toolCallId }} = params || {};

          if (toolCallName === 'render_ItemsList') {
            try {
              const itemsMessage: UIMessage = {
                id: 'items-' + toolCallId,
                sender: 'agent',
                timestamp: new Date(),
                type: 'items',
                items: (toolCallArgs as any).items || []
              };

              setMessages(prev => [...prev, itemsMessage]);

              const toolResult: ToolMessage = {
                id: `tool-result-${Date.now()}`,
                role: 'tool',
                content: JSON.stringify({
                  result: 'success',
                  message: 'Items were rendered successfully.'
                }),
                toolCallId
              };
              
              return {
                messages: [...params.messages, toolResult]
              }; 
            } catch (error) {              
              const toolErrorResult: ToolMessage = {
                id: `tool-error-${Date.now()}`,
                role: 'tool',
                content: JSON.stringify({
                  result: 'error',
                  message: 'Failed to render items list.',
                  error: error instanceof Error ? error.message : 'Unknown error'
                }),
                toolCallId
              };

              return {
                messages: [...params.messages, toolErrorResult]
              };
            }
          }
        },

        onTextMessageEndEvent: (params: { event: TextMessageEndEvent }) => {
          console.log('Text message ended:', params.event.messageId);
        },

        onRunFinishedEvent: () => {
          console.log('Agent run finished');
          setIsLoading(false);
        },

        onRunErrorEvent: (params: { event: any }) => {
          console.error('Agent run error:', params.event);
          setIsLoading(false);
        }
      });

      console.log('Agent run result:', result);
      
      console.log('Agent messages after run:', agent.messages);
      console.log('Agent state after run:', agent.state);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setIsLoading(false);
    }
  };

  const sendInputMessage = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const abortRun = () => {
    if (agent && isLoading) {
      agent.abortRun();
      setIsLoading(false);
    }
  };

  const onInputButtonClick = () => {
    isLoading ? abortRun() : sendInputMessage();
  };

  const createNewThread = () => {
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    const newAgent = createAgent({url: agentUrl, state: agent?.state || {}});
    updateThreadIdUrl(newAgent.threadId);
    setAgent(newAgent);
  };

  const onConnectClick = () => {
    const shouldPreserve = !!initialQueryParams.target || agentUrl !== AG_UI_URL;
    updateUrlQueryParam('target', agentUrl, shouldPreserve);
    createNewThread();
  };

  const onNewThreadClick = () => {
    createNewThread();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendInputMessage();
    }
  };

  return (
    <div className="playground">
      <div className="header">
        <h1 className="header__title">AG-UI ADK Chat Playground</h1>
        <div className="header__url-input">
          <label htmlFor="agent-url" className="header__label">AG-UI URL:</label>
          <input
            id="agent-url"
            type="text"
            value={agentUrl}
            onChange={(e) => setAgentUrl(e.target.value)}
            placeholder={"http://your-ag-ui-server.com/ag-ui"}
            className="header__input"
          />
          <button 
            className="header__button"
            onClick={onConnectClick}
            title="Connect and create new thread"
          >
            Connect
          </button>
        </div>
      </div>
      <div className="playground__content">
        <div className="sidebar">
          <div className="sidebar__section">
            <label htmlFor="agent-state" className="sidebar__label">
              Agent State:
            </label>
            <textarea
              id="agent-state"
              value={stateTextarea}
              onChange={(e) => setStateTextarea(e.target.value)}
              placeholder='{}'
              className="sidebar__textarea"
              rows={10}
            />
            <button 
              onClick={onUpdateStateClick} 
              className="sidebar__button"
              disabled={!agent}
            >
              Update State
            </button>
          </div>
        </div>
        <div className="chat">
          <div className="chat__header">
            <div className="chat__thread-info">
              <span className="chat__thread-label">Thread ID:</span>
              <span className="chat__thread-id">{agent?.threadId || 'Not specified'}</span>
            </div>
            <button 
              className="chat__new-thread-button"
              onClick={onNewThreadClick}
              title="Create new thread"
            >
              +
            </button>
          </div>
          <div className="chat__messages">
            {messages.map((message) => (
              <div key={message.id} className={`message message--${message.sender}`}>
                <div className="message__content">
                  {message.type === 'items' && message.items ? (
                    <ItemsList
                      items={message.items}
                      onItemClick={(itemText) => sendMessage(itemText)}
                    />
                  ) : (
                    message.text
                  )}
                </div>
                <div className="message__time">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message message--agent">
                <div className="message__content message__content--loading">
                  <div className="message__typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat__input">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyUp={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              rows={1}
              className="chat__textarea"
            />
            <button 
              onClick={onInputButtonClick} 
              disabled={!isLoading && !inputValue.trim()}
              className={`chat__button ${isLoading ? 'chat__button--stop' : 'chat__button--send'}`}
            >
              {isLoading ? (
                <>
                  <span className="chat__button-icon">⏹</span>
                  Stop
                </>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
