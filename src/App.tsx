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

import ItemsList from './ItemsList';

import './App.css';

interface UIMessage {
  id: string;
  text?: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'items';
  items?: string[];
}

const TOOL_DEFINITIONS: Tool[] = [
  {
    name: "render_ItemsList",
    description: "Render a item list: the items can be from any entity.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "string",
            description: "The name of an item to display in the list."
          }
        }
      },
      required: ["items"]
    }
  }
];

const App: React.FC = () => {
  const [agentUrl, setAgentUrl] = useState('http://localhost:3001/ag-ui');
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
      state: {
        user_id: "user-123",
        user_name: "Joe Doe"
      }
    });
    setAgent(agent);
  }, [agentUrl]);

  const createAgent = ({url, state} : {url: string, state: object}) => {
    const agent = new HttpAgent({
      url,
      initialState: state,
      initialMessages: [
        {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `
            Always verify the possibility of using rendering tools to display data visually to the user.
            You must ensure that the user has the most visual experience possible, utilizing the available rendering tools.

            Before call an render tool, always send a text message to inform the user about the data that will be presented visually.
            Always present items names using the render_ItemsList rendering tool.
            Example: "Here are the items: " => calls the tool render_ItemsList.
            After the user selects an item, respond appropriately based on data of the selected item.

            Items can be of any entity, such as products, articles, locations, broadcasts etc.
          `
        } as SystemMessage
      ]
    })
    console.log('Current thread id: ', agent.threadId)
    return agent;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (agent) setStateTextarea(JSON.stringify(agent.state, null, 2));
  }, [agent]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading])

  const updateAgentState = () => {
    if (!agent) return;
    
    try {
      const newState = JSON.parse(stateTextarea);
      agent.state = newState;
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
      const userMessage: UserMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText
      };
      agent.addMessage(userMessage);

      console.log('Agent messages before run:', agent.messages);
      console.log('Agent state before run:', agent.state);

      const result = await agent.runAgent({
        tools: TOOL_DEFINITIONS
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
          console.log('Agent state changed:', params.event);
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
                  status: 'error',
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

  const handleAbortRun = () => {
    if (agent && isLoading) {
      agent.abortRun();
      setIsLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (isLoading) {
      handleAbortRun();
    } else {
      sendInputMessage();
    }
  };

  const createNewThread = () => {
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    const newAgent = createAgent({url: agentUrl, state: agent?.state || {}});
    setAgent(newAgent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendInputMessage();
    }
  };

  return (
    <div className="app">
      <div className="chat-header">
        <h1>AG-UI Chat Playground</h1>
        <div className="url-input-container">
          <label htmlFor="agent-url">AG-UI URL:</label>
          <input
            id="agent-url"
            type="text"
            value={agentUrl}
            onChange={(e) => setAgentUrl(e.target.value)}
            placeholder="http://localhost:3001/ag-ui"
            className="url-input"
          />
        </div>
      </div>
      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <label htmlFor="agent-state" className="sidebar-label">
              Agent State:
            </label>
            <textarea
              id="agent-state"
              value={stateTextarea}
              onChange={(e) => setStateTextarea(e.target.value)}
              placeholder='{}'
              className="json-input"
              rows={10}
            />
            <button 
              onClick={updateAgentState} 
              className="update-state-btn"
              disabled={!agent}
            >
              Update State
            </button>
          </div>
        </div>
        <div className="chat-container">
          <div className="chat-header-inner">
            <div className="thread-info">
              <span className="thread-label">Thread ID:</span>
              <span className="thread-id">{agent?.threadId || 'Not specified'}</span>
            </div>
            <button 
              className="new-thread-button"
              onClick={createNewThread}
              title="Create new thread"
            >
              +
            </button>
          </div>
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  {message.type === 'items' && message.items ? (
                    <ItemsList
                      items={message.items}
                      onItemClick={(itemText) => sendMessage(itemText)}
                    />
                  ) : (
                    message.text
                  )}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message agent">
                <div className="message-content loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyUp={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              rows={1}
            />
            <button 
              onClick={handleButtonClick} 
              disabled={!isLoading && !inputValue.trim()}
              className={isLoading ? 'stop-button' : 'send-button'}
            >
              {isLoading ? (
                <>
                  <span className="stop-icon">⏹</span>
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

export default App;
