import each from 'lodash/each';
import find from 'lodash/find';
import map from 'lodash/map';
import last from 'lodash/last';
import isEmpty from 'lodash/isEmpty';

import PandaBridge from 'pandasuite-bridge';
import PandaFetch from './PandaFetch';
import { parse } from './utils/json';

const pointer = require('json-pointer');

const originalFetch = require('isomorphic-fetch');
const fetch = require('fetch-retry')(originalFetch);

const pagination = {
  offsets: [],
  index: 0,
  pointerData: [],
};

let updateResourcesInProgress = false;
let waitingQueue = [];

class FetchHandler {
  constructor() {
    this.pandaFetch = new PandaFetch();
  }

  updateProperties(properties) {
    this.pandaFetch.properties = properties;
  }

  updateResources(resources) {
    if (isEmpty(resources)) {
      return;
    }

    const { responsesStore } = this.pandaFetch;

    updateResourcesInProgress = true;
    Promise.all(
      map(resources, async (resource) => {
        if (resource.local && resource.data && resource.data.sk) {
          const response = await fetch(resource.path);
          const data = await response.text();
          return responsesStore.setItem(resource.data.sk, data);
        }
        return null;
      }),
    ).then(() => {
      updateResourcesInProgress = false;
      each(waitingQueue, ([callBack, callBackArgs]) => {
        callBack.apply(this, callBackArgs);
      });
      waitingQueue = [];
    });
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

  setSuccessCallback(callback, withPandaBridge = true) {
    this.pandaFetch.callback = (data, error) => {
      if (error) {
        if (withPandaBridge) {
          PandaBridge.send('requestFailed');
        }
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

      if (withPandaBridge) {
        PandaBridge.send('requestCompleted', [{ data: schema }]);
        PandaBridge.send(PandaBridge.UPDATED, {
          queryable: schema,
        });
      }

      if (callback) {
        callback(responseData);
      }
      return true;
    };
  }

  doRequest(properties) {
    if (updateResourcesInProgress) {
      waitingQueue.push([this.doRequest, [properties]]);
      return false;
    }
    if (properties) {
      this.updateProperties(properties);
    }
    this.resetPagination();
    this.pandaFetch.doRequest();
    return true;
  }

  resetPagination() {
    pagination.offsets = [];
    pagination.index = 0;
    pagination.pointerData = [];
    this.pandaFetch.customQuery = {};
  }

  // eslint-disable-next-line class-methods-use-this
  getPaginationIndex() {
    return pagination.index;
  }

  clearCache(properties) {
    if (updateResourcesInProgress) {
      waitingQueue.push([this.clearCache, [properties]]);
      return false;
    }
    if (properties) {
      this.updateProperties(properties);
    }
    this.pandaFetch.clearCache();
    return true;
  }

  redoRequests(properties) {
    if (updateResourcesInProgress) {
      waitingQueue.push([this.redoRequests, [properties]]);
      return false;
    }
    if (properties) {
      this.updateProperties(properties);
    }
    this.pandaFetch.redoRequests();
    return true;
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
        } else {
          return false;
        }
      }
      return true;
    }
    return false;
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
        } else {
          return false;
        }
      }
      return true;
    }
    return false;
  }
}

const singletonInstance = new FetchHandler();
Object.freeze(singletonInstance);

export const FetchHandlerConstructor = FetchHandler;

export default singletonInstance;
