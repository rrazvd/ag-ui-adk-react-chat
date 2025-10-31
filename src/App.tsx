import React, { useState, useEffect, useRef } from 'react';

import { HttpAgent, type AgentStateMutation } from '@ag-ui/client';

import type { 
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
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
    description: "Render a item list",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "string"
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createAgent = (url: string) => {
    const httpAgent = new HttpAgent({
      url,
      initialState: {
        user_id: "user-123",
        user_name: "Joe Doe"
      },
      initialMessages: [
        {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `
            Always verify the possibility of using rendering tools to display data visually to the user.
            You must ensure that the user has the most visual experience possible, utilizing the available rendering tools.

            Before call an render tool, always send a text message to inform the user about the data that will be presented visually.
            Always present items available data using the render_ItemsList rendering tool.
            Example: "Here are the available items: " => calls the tool render_ItemsList.
          `
        } as SystemMessage
      ]
    });

    setAgent(httpAgent);
  };

  useEffect(() => {
    createAgent(agentUrl);
  }, [agentUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !agent || isLoading) return;

    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentInput = inputValue;
    setInputValue('');   

    try {      
      const userMessage: UserMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: currentInput
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

        onToolCallEndEvent: (params: { event: ToolCallEndEvent; toolCallName: string; toolCallArgs: any; messages: any[]; }): AgentStateMutation | void => {
          console.log('Tool call ended:', params.event, params.toolCallArgs, params.toolCallName);
          const {toolCallName, toolCallArgs, event: { toolCallId }} = params || {};

          if (toolCallName === 'render_ItemsList') {
            try {
              // Create and add items visualization message
              const itemsMessage: UIMessage = {
                id: 'items-' + toolCallId,
                sender: 'agent',
                timestamp: new Date(),
                type: 'items',
                items: (toolCallArgs as any).items || []
              };

              setMessages(prev => [...prev, itemsMessage]);

              // Create tool result message
              const toolResult: ToolMessage = {
                id: `tool-result-${Date.now()}`,
                role: 'tool',
                content: JSON.stringify({
                  result: 'success',
                  message: 'Items were rendered successfully.'
                }),
                toolCallId
              };
              
              // Return AgentStateMutation to add the tool result message to the conversation
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <div className="chat-header">
        <h1>AG-UI Chat Playground</h1>
        <div className="url-input-container">
          <label htmlFor="agent-url">Agent URL:</label>
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
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-content">
              {message.type === 'items' && message.items ? (
                <ItemsList items={message.items} title="Available Items" />
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
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyUp={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          rows={1}
        />
        <button 
          onClick={sendMessage} 
          disabled={!inputValue.trim() || isLoading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default App;
