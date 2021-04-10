import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useRecoilValue } from 'recoil';

import ReactJson from 'react-json-view';

import isObject from 'lodash/isObject';
import filter from 'lodash/filter';
import parseInt from 'lodash/parseInt';
import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';

import { Button, Alert, Dropdown, Checkbox, Input } from 'pandasuite-bridge-react/lib/ui';

import resultAtom from '../../atoms/Result';
import FetchHandler from '../../FetchHandler';
import { parse } from '../../utils/json';

function Configuration(props) {
  const {
    properties, setProperty,
  } = props;
  const { keys: oriKeys, pagination } = properties;
  const keys = oriKeys || [];

  const [loading, setLoading] = useState({
    doRequest: false,
    prevPage: false,
    nextPage: false,
  });
  const results = useRecoilValue(resultAtom);
  const intl = useIntl();

  const jsonResult = parse(results);
  const keyOffset = FetchHandler.getKeyOffset();

  const isKeysConfigured = keys && keys.length > 0;

  if (!!keyOffset !== pagination) {
    setProperty('pagination', !!keyOffset);
  }

  const handleSelect = (e) => {
    const keyName = filter(
      e.namespace.concat([e.name]),
      (name) => parseInt(name).toString() !== name,
    );

    const key = {
      name: keyName,
      type: null,
    };

    if (!find(keys, (existingKey) => isEqual(existingKey, key))) {
      setProperty('keys', keys.concat([key]));
    }
  };

  const onDelete = (keyIndex) => () => {
    const newKeys = cloneDeep(keys);
    newKeys.splice(keyIndex, 1);
    setProperty('keys', newKeys);
  };

  const onTypeChange = (keyIndex) => (event) => {
    const newKeys = cloneDeep(keys);
    newKeys[keyIndex].type = event.target.value;
    setProperty('keys', newKeys);
  };

  const handlePointerChange = (keyIndex) => (event) => {
    const newKeys = cloneDeep(keys);
    newKeys[keyIndex].pointer = event.target.value;
    setProperty('keys', newKeys);
  };

  const handleCheckboxChange = (keyIndex) => (event) => {
    const newKeys = cloneDeep(keys);

    if (event.target.checked) {
      newKeys[keyIndex].pointer = '';
    } else {
      delete newKeys[keyIndex].pointer;
    }
    setProperty('keys', newKeys);
  };

  const doRequest = (requestName) => {
    setLoading({ ...loading, [requestName]: true });

    FetchHandler[requestName]().then(() => {
      setLoading({ ...loading, [requestName]: false });
    }).catch(() => {
      setLoading({ ...loading, [requestName]: false });
    });
  };

  return (
    <>
      <Button loading={loading.doRequest} onClick={() => doRequest('doRequest')} className="my-5">
        {intl.formatMessage({ id: 'request.button.title' })}
      </Button>
      {isKeysConfigured && (
      <div className="flex flex-col mb-5">
        <div>
          <div className="align-middle inline-block min-w-full">
            <div className="overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'result.field.title' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'result.type.title' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {keys.map((key, index) => (
                    <tr>
                      <td className="w-1/4 px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex flex-col">
                            <div className="flex text-sm text-gray-500 divide-x shadow-sm">
                              {key.name.map((name, i) => {
                                if (key.name.length - 1 === i) {
                                  return (<div className="flex-1 p-1 px-2 text-indigo-600">{name}</div>);
                                }
                                return (<div className="flex-1 p-1 px-2">{name}</div>);
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full flex items-center space-x-3">
                          <Dropdown onChange={onTypeChange(index)} value={key.type}>
                            <Dropdown.Item value="string">{intl.formatMessage({ id: 'key.type.string' })}</Dropdown.Item>
                            <Dropdown.Item value="boolean">{intl.formatMessage({ id: 'key.type.boolean' })}</Dropdown.Item>
                            <Dropdown.Item value="number">{intl.formatMessage({ id: 'key.type.number' })}</Dropdown.Item>
                            <Dropdown.Item value="image">{intl.formatMessage({ id: 'key.type.image' })}</Dropdown.Item>
                            <Dropdown.Item value="audio">{intl.formatMessage({ id: 'key.type.audio' })}</Dropdown.Item>
                            <Dropdown.Item value="video">{intl.formatMessage({ id: 'key.type.video' })}</Dropdown.Item>
                            <Dropdown.Item value="offset">{intl.formatMessage({ id: 'key.type.offset' })}</Dropdown.Item>
                          </Dropdown>
                          {key.type === 'offset' && (
                            <>
                              <Checkbox
                                checked={key.pointer !== undefined}
                                onChange={handleCheckboxChange(index)}
                              >
                                {intl.formatMessage({ id: 'key.type.offset.pointer' })}
                              </Checkbox>
                              {key.pointer !== undefined && (
                                <Input
                                  value={key.pointer}
                                  onChange={handlePointerChange(index)}
                                  placeholder="/path"
                                />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button type="button" className="text-indigo-600 hover:text-indigo-900 focus:outline-none" onClick={onDelete(index)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      )}
      {isObject(jsonResult) && (
        <>
          {keyOffset && (
            <div className="flex items-center space-x-3">
              {keyOffset.pointer === undefined && (
              <Button loading={loading.prevPage} onClick={() => doRequest('prevPage')}>
                {intl.formatMessage({ id: 'prev.button.title' })}
              </Button>
              )}
              <Button loading={loading.nextPage} onClick={() => doRequest('nextPage')}>
                {intl.formatMessage({ id: 'next.button.title' })}
              </Button>
            </div>
          )}
          {!isKeysConfigured && (
            <Alert>{intl.formatMessage({ id: 'result.description' })}</Alert>
          )}
          <ReactJson
            src={jsonResult}
            name={false}
            onAdd={false}
            onEdit={false}
            onDelete={false}
            enableClipboard={false}
            displayObjectSize={false}
            displayDataTypes={false}
            collapsed={2}
            onSelect={handleSelect}
          />
        </>
      )}
    </>
  );
}

export default Configuration;
