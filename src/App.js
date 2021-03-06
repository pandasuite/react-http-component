import React, { useEffect } from 'react';
import './App.css';

import { usePandaBridge } from 'pandasuite-bridge-react';
import PandaBridge from 'pandasuite-bridge';

import isEmpty from 'lodash/isEmpty';
import isString from 'lodash/isString';
import assign from 'lodash/assign';

import Fetch from './components/Fetch';
import Setup from './components/setup/Setup';
import IntlProvider from './components/IntlProvider';
import FetchHandler from './FetchHandler';

function App() {
  const {
    properties, resources, setProperty, setResources,
  } = usePandaBridge({
    actions: {
      start: ({ loop, content }) => {
        let properties = PandaBridge.properties;

        if (!isEmpty(content)) {
          const encodedContent = isString(content) ? content : JSON.stringify(content);
          properties = assign({}, properties, { content: encodedContent });
        }
        if (loop) {
          FetchHandler.doRequests(properties);
        } else {
          FetchHandler.doRequest(properties);
        }
      },
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
      <div>
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
