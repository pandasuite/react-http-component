import React from 'react';
import PropTypes from 'prop-types';

import PandaBridge from 'pandasuite-bridge';
import { useRecoilValue } from 'recoil';

import ReactJson from 'react-json-view';
import { useIntl } from 'react-intl';

import isObject from 'lodash/isObject';
import filter from 'lodash/filter';
import parseInt from 'lodash/parseInt';
import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';

import { FaTrashAlt } from 'react-icons/fa';

import resultAtom from '../atoms/Result';
import { parse } from '../utils/json';
import FetchHandler from '../FetchHandler';
import Persitence from './Persitence';

function Setup(props) {
  const {
    properties, resources, setProperty, setResources,
  } = props;
  const { keys: oriKeys } = properties;
  const keys = oriKeys || [];

  const results = useRecoilValue(resultAtom);
  const intl = useIntl();

  if (!PandaBridge.isStudio) {
    return null;
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

  const jsonResult = parse(results);
  const keyOffset = FetchHandler.getKeyOffset();

  return (
    <>
      <p>
        <button type="button" onClick={() => FetchHandler.doRequest()}>{intl.formatMessage({ id: 'request.button.title' })}</button>
        {keyOffset
          && (
            <>
              {keyOffset.pointer === undefined
                && (
                <button type="button" onClick={() => FetchHandler.prevPage()}>{intl.formatMessage({ id: 'prev.button.title' })}</button>
                )}
              <button type="button" onClick={() => FetchHandler.nextPage()}>{intl.formatMessage({ id: 'next.button.title' })}</button>
            </>
          )}
      </p>
      <p>
        <ul>
          {keys.map((key, index) => (
            <li className="key-item" key={key.name[key.name.length - 1]}>
              <p>{key.name[key.name.length - 1]}</p>
              <select onChange={onTypeChange(index)}>
                <option value="string" selected={key.type === 'string'}>{intl.formatMessage({ id: 'key.type.string' })}</option>
                <option value="boolean" selected={key.type === 'boolean'}>{intl.formatMessage({ id: 'key.type.boolean' })}</option>
                <option value="number" selected={key.type === 'number'}>{intl.formatMessage({ id: 'key.type.number' })}</option>
                <option value="image" selected={key.type === 'image'}>{intl.formatMessage({ id: 'key.type.image' })}</option>
                <option value="audio" selected={key.type === 'audio'}>{intl.formatMessage({ id: 'key.type.audio' })}</option>
                <option value="video" selected={key.type === 'video'}>{intl.formatMessage({ id: 'key.type.video' })}</option>
                <option value="offset" selected={key.type === 'offset'}>{intl.formatMessage({ id: 'key.type.offset' })}</option>
              </select>
              {key.type === 'offset'
                && (
                  <label htmlFor>
                    <input
                      type="checkbox"
                      checked={key.pointer !== undefined}
                      onChange={handleCheckboxChange(index)}
                    />
                    {intl.formatMessage({ id: 'key.type.offset.pointer' })}
                    {key.pointer !== undefined
                    && (
                      <input style={{ marginLeft: '10px' }} type="text" value={key.pointer} onChange={handlePointerChange(index)} />
                    )}
                  </label>
                )}
              <button type="button" onClick={onDelete(index)}>
                <FaTrashAlt className="small" />
              </button>
            </li>
          ))}
        </ul>
      </p>
      {isObject(jsonResult)
        && (
          <>
            <span id="result-description">{intl.formatMessage({ id: 'result.description' })}</span>
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
      {(Object.keys(resources).length > 0 || isObject(jsonResult)) && (
      <Persitence
        properties={properties}
        resources={resources}
        setResources={setResources}
      />
      )}
    </>
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
