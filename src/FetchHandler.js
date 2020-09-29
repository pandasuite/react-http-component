import find from 'lodash/find';
import last from 'lodash/last';

import PandaBridge from 'pandasuite-bridge';
import PandaFetch from './PandaFetch';
import { parse } from './utils/json';

const pointer = require('json-pointer');

const pagination = {
  offsets: [],
  index: 0,
  pointerData: [],
};

class FetchHandler {
  constructor() {
    this.pandaFetch = new PandaFetch();
  }

  updateProperties(properties) {
    this.pandaFetch.properties = properties;
  }

  getKeyOffset() {
    const { keys } = this.pandaFetch.properties;
    return find(keys || [], (k) => k.type === 'offset');
  }

  saveOffset(schema, keyOffset) {
    const offset = keyOffset || this.getKeyOffset();
    let value = null;

    try {
      value = pointer.get(schema, pointer.compile(offset.name));
    } catch (e) {}

    const existingPage = pagination.offsets[pagination.index];
    if (existingPage) {
      pagination.offsets[pagination.index] = value;
    } else {
      pagination.offsets.push(value);
    }
    return existingPage;
  }

  setSuccessCallback(callback) {
    this.pandaFetch.callback = (data, error) => {
      if (error) {
        PandaBridge.send('requestFailed');
        return false;
      }

      let responseData = data;

      const schema = parse(data) || {};
      const keyOffset = this.getKeyOffset();

      if (keyOffset) {
        const offsetExists = this.saveOffset(schema, keyOffset);

        if (keyOffset.pointer) {
          try {
            if (!offsetExists) {
              const newData = pointer.get(schema, keyOffset.pointer);
              pagination.pointerData = pagination.pointerData.concat(newData);
            }
            pointer.set(schema, keyOffset.pointer, pagination.pointerData);
            responseData = JSON.stringify(schema);
          } catch (e) {}
        }
      }

      PandaBridge.send('requestCompleted', [{ data: schema }]);
      PandaBridge.send(PandaBridge.UPDATED, {
        queryable: schema,
      });

      if (callback) {
        callback(responseData);
      }
      return true;
    };
  }

  doRequest(properties) {
    if (properties) {
      this.updateProperties(properties);
    }
    this.resetPagination();
    this.pandaFetch.doRequest();
  }

  resetPagination() {
    pagination.offsets = [];
    pagination.index = 0;
    pagination.pointerData = [];
    this.pandaFetch.customQuery = {};
  }

  clearCache(properties) {
    if (properties) {
      this.updateProperties(properties);
    }
    this.pandaFetch.clearCache();
  }

  redoRequests(properties) {
    if (properties) {
      this.updateProperties(properties);
    }
    this.pandaFetch.redoRequests();
  }

  nextPage(properties) {
    if (properties) {
      this.updateProperties(properties);
    }
    const keyOffset = this.getKeyOffset();

    if (keyOffset) {
      const name = last(keyOffset.name);
      const offsetValue = pagination.offsets[pagination.index];

      if (offsetValue) {
        this.pandaFetch.setQueryParam(name, offsetValue);
        this.pandaFetch.doRequest();
        pagination.index += 1;
      } else {
        this.pandaFetch.removeQueryParam(name);
        if (offsetValue !== null) { // last page
          this.pandaFetch.doRequest();
        }
      }
    }
  }

  prevPage(properties) {
    if (properties) {
      this.updateProperties(properties);
    }
    const keyOffset = this.getKeyOffset();

    if (keyOffset) {
      if (pagination.offsets[pagination.index] === null) { // Last page
        pagination.index -= 1;
      }

      const name = last(keyOffset.name);
      const offsetValue = pagination.offsets[pagination.index - 1];

      if (offsetValue) {
        this.pandaFetch.setQueryParam(name, offsetValue);
        this.pandaFetch.doRequest();
        pagination.index -= 1;
      } else {
        const executeRequest = this.pandaFetch.customQuery[name] !== undefined;

        this.pandaFetch.removeQueryParam(name);
        if (executeRequest) {
          this.pandaFetch.doRequest();
        }
      }
    }
  }
}

const singletonInstance = new FetchHandler();
Object.freeze(singletonInstance);

export default singletonInstance;
