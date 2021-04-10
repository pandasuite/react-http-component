import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

import { useIntl } from 'react-intl';
import { Button, Alert } from 'pandasuite-bridge-react/lib/ui';

import OfflineFetchHandler from '../../OfflineFetchHandler';

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

  const renderResourceType = (resource) => {
    switch (resource.type) {
      case 'JSON':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    
      case 'Image':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    
      case 'Audio':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
    
      case 'Video':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        );
    
      default:
        break;
    }
    return resource.type;
  };

  const renderResourceName = (resource) => {
    let keys = resource.data.name.split('/');

    if (keys.length > 1) {
      keys = keys.slice(1);
    } else {
      keys = [keys[0].replace(OfflineFetchHandler.REQUEST_PREFIX, '')];
    }
    return keys.map((name, i) => {
      if (keys.length - 1 === i) {
        return (
          <div className="flex-1 p-1 px-2 text-indigo-600">{name}</div>
        );
      }
      return (
        <div className="flex-1 p-1 px-2">{name}</div>
      );
    });
  };

  console.dir(resources);
  console.dir(state.resources);

  const downloadedResourcesCount = Object.keys(resources).length;

  return (
    <>
      {(downloadedResourcesCount > 0) && (
        <Alert>
          {intl.formatMessage({ id: 'offline.delete.button.title' }, { count: downloadedResourcesCount })}
          <div className="flex px-2 items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <button onClick={handleDeleteOfflineClick} className="font-medium underline text-right">
              {intl.formatMessage({ id: 'offline.delete.action.title' })}
            </button>
          </div>
        </Alert>
      )}
      <div className="flex space-x-3">
        {(state.resources.length > 0) && (
        <Button primary loading={state.loading} onClick={handleOfflineClick} className="my-5">
          {(downloadedResourcesCount > 0) ? (
            intl.formatMessage({ id: 'offline.delta.button.title' })
          ) : (
            intl.formatMessage({ id: 'offline.button.title' })
          )}
        </Button>
        )}
        <Button loading={state.loading} onClick={handleRequestClick} className="my-5">
          {(state.resources.length > 0 || downloadedResourcesCount > 0) ? (
            intl.formatMessage({ id: 'offline.refresh.button.title' })
          ) : (
            intl.formatMessage({ id: 'offline.list.button.title' })
          )}
        </Button>
        </div>
        <div className="flex flex-col mb-5">
        <div>
          <div className="align-middle inline-block min-w-full">
            <div className="overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.resources.map((resource) => (
                    <tr className={`${(!resources || !resources[resource.id]) ? 'bg-green-50' : ''}`}>
                      <td className="w-2/3 px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex flex-col">
                            <div className="flex text-sm text-gray-500 divide-x shadow-sm">
                              {renderResourceName(resource)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderResourceType(resource)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
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
