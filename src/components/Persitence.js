import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

import { useIntl } from 'react-intl';

import OfflineFetchHandler from '../OfflineFetchHandler';

function Persitence(props) {
  const { properties, resources, setResources } = props;
  const intl = useIntl();
  const [state, setState] = useState({
    loading: false,
    resources: [],
  });

  const offlineFetchHandler = useMemo(() => new OfflineFetchHandler(properties), [properties]);

  const handleRequestClick = () => {
    setState({ loading: true, resources: [] });
    offlineFetchHandler.doAllRequest().then((results) => {
      setState({ loading: false, resources: results });
    });
  };

  const handleOfflineClick = () => {
    setResources(state.resources);
  };

  const handleDeleteOfflineClick = () => {
    setResources([]);
  };

  return (
    <>
      {(Object.keys(resources).length > 0) && (
      <button type="button" onClick={handleDeleteOfflineClick}>{intl.formatMessage({ id: 'offline.delete.button.title' })}</button>
      )}
      <button type="button" onClick={handleRequestClick} disabled={state.loading}>{intl.formatMessage({ id: 'offline.list.button.title' })}</button>
      <ul>
        {state.resources.map((resource) => (
          <li className="key-item" key={resource.id}>
            <p>
              <small>{resource.data.name}</small>
              &nbsp;
              <b>{resource.type}</b>
            </p>
          </li>
        ))}
      </ul>
      {(state.resources.length > 0) && (
      <button type="button" onClick={handleOfflineClick}>{intl.formatMessage({ id: 'offline.button.title' })}</button>
      )}
    </>
  );
}

Persitence.defaultProps = {
  setResources: () => null,
};

Persitence.propTypes = {
  properties: PropTypes.oneOfType([PropTypes.object]).isRequired,
  resources: PropTypes.oneOfType([PropTypes.object]).isRequired,
  setResources: PropTypes.func,
};

export default Persitence;
