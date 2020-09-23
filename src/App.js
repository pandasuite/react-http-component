import React, { useRef } from 'react';
import './App.css';

import { usePandaBridge } from 'pandasuite-bridge-react';
import PandaBridge from 'pandasuite-bridge';

import Fetch from './components/Fetch';
import PandaFetch from './PandaFetch';

function App() {
  const fetchRef = useRef();

  const { properties } = usePandaBridge({
    actions: {
      start: () => {
        if (fetchRef.current) {
          fetchRef.current.doRequest();
        } else {
          new PandaFetch(PandaBridge.properties).doRequest();
        }
      },
      clearCache: () => {
        if (fetchRef.current) {
          fetchRef.current.clearCache();
        } else {
          new PandaFetch(PandaBridge.properties).clearCache();
        }
      },
      redoRequests: () => {
        if (fetchRef.current) {
          fetchRef.current.redoRequests();
        } else {
          new PandaFetch(PandaBridge.properties).redoRequests();
        }
      },
    },
  });

  if (properties === undefined) {
    return null;
  }

  return (
    <div className="App">
      <Fetch
        properties={properties}
        ref={fetchRef}
      />
    </div>
  );
}

export default App;
