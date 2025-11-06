import React from 'react'
import ReactDOM from 'react-dom/client'

import { Playground } from './pages'

import './main.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>,
)
