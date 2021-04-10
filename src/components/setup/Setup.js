import React from 'react';
import PropTypes from 'prop-types';

import { Tabs, Tab } from 'pandasuite-bridge-react/lib/ui';

import PandaBridge from 'pandasuite-bridge';

import { useIntl } from 'react-intl';

import Persistence from './Persistence';
import Configuration from './Configuration';

function Setup(props) {
  const {
    properties, resources, setProperty, setResources,
  } = props;

  const intl = useIntl();

  if (!PandaBridge.isStudio) {
    return null;
  }

  return (
    <Tabs>
      <Tab eventKey="configuration" title={intl.formatMessage({ id: 'tab.configuration.title' })}>
        <Configuration
          properties={properties}
          resources={resources}
          setProperty={setProperty}
          setResources={setResources}            
        />
      </Tab>
      <Tab eventKey="offline" title={intl.formatMessage({ id: 'tab.offline.title' })}>
        <Persistence
          properties={properties}
          resources={resources}
          setResources={setResources}
        />
      </Tab>
    </Tabs>
  );
}

Setup.defaultProps = {
  setProperty: () => null,
  setResources: () => null,
};

Setup.propTypes = {
  properties: PropTypes.oneOfType([PropTypes.object]).isRequired,
  resources: PropTypes.oneOfType([PropTypes.object]).isRequired,
  setProperty: PropTypes.func,
  setResources: PropTypes.func,
};

export default Setup;
