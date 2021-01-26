import React, { useEffect } from 'react';
import './App.css';

import { usePandaBridge } from 'pandasuite-bridge-react';
import PandaBridge from 'pandasuite-bridge';

import Fetch from './components/Fetch';
import Setup from './components/Setup';
import IntlProvider from './components/IntlProvider';
import FetchHandler from './FetchHandler';

function App() {
  const {
    properties, resources, setProperty, setResources,
  } = usePandaBridge({
    actions: {
      start: () => { FetchHandler.doRequest(PandaBridge.properties); },
      clearCache: () => { FetchHandler.clearCache(PandaBridge.properties); },
      redoRequests: () => { FetchHandler.redoRequests(PandaBridge.properties); },
      nextPage: () => { FetchHandler.nextPage(); },
      prevPage: () => { FetchHandler.prevPage(); },
    },
  });

  useEffect(() => {
    FetchHandler.updateResources(resources);
  }, [resources]);

  if (properties === undefined) {
    return null;
  }

  return (
    <IntlProvider>
      <div className="App">
        <Fetch
          properties={properties}
        />
        <Setup
          properties={properties}
          resources={resources}
          setProperty={setProperty}
          setResources={setResources}
        />
      </div>
    </IntlProvider>
  );
}

export default App;
