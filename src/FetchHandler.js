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

class FetchHandler {
  _callback = null;
  _pagination = {
    offsets: [],
    index: 0,
    pointerData: [],
  };
  initPromise = Promise.resolve();

  constructor() {
    this.pandaFetch = new PandaFetch();
  }

  set callback(callback) {
    this._callback = callback;
  }

  updateProperties(properties) {
    this.pandaFetch.properties = properties;
  }

  updateResources(resources) {
    if (isEmpty(resources)) {
      return;
    }
    this.initCacheFromResources(resources);
  }

  initCacheFromResources(resources) {
    this.initPromise = new Promise((resolve) => {
      const { responsesStore } = this.pandaFetch;

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
        resolve();
      });
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

    const existingPage = this._pagination.offsets[this._pagination.index];
    if (existingPage) {
      this._pagination.offsets[this._pagination.index] = value;
    } else {
      this._pagination.offsets.push(value);
    }
    return existingPage;
  }

  constructResponse(data) {
    return new Promise((resolve, reject) => {
      let responseData = data;

      const schema = parse(data) || {};
      const keyOffset = this.getKeyOffset();

      if (keyOffset) {
        const offsetExists = this.saveOffset(schema, keyOffset);

        if (keyOffset.pointer) {
          try {
            if (!offsetExists) {
              const newData = pointer.get(schema, keyOffset.pointer);
              this._pagination.pointerData = this._pagination.pointerData.concat(newData);
            }
            pointer.set(schema, keyOffset.pointer, this._pagination.pointerData);
            responseData = JSON.stringify(schema);
          } catch (e) {
            reject(e);
          }
        }
      }
      resolve([responseData, schema]);
    });
  }

  // eslint-disable-next-line class-methods-use-this
  sendPandaEvents([data, schema]) {
    return new Promise((resolve) => {
      PandaBridge.send('requestCompleted', [{ data: schema }]);
      PandaBridge.send(PandaBridge.UPDATED, {
        queryable: schema,
      });
      resolve([data, schema]);
    });
  }

  notify([data, schema]) {
    return new Promise((resolve) => {
      if (this._callback) {
        this._callback(data);
      }
      resolve([data, schema]);
    });
  }

  processResponse(promise, withoutEvents = false) {
    let returnPromise = promise;

    returnPromise = returnPromise
      .then(this.constructResponse.bind(this));
    if (!withoutEvents) {
      returnPromise = returnPromise
        .then(this.sendPandaEvents.bind(this));
    }
    returnPromise = returnPromise
      .then(this.notify.bind(this));

    if (!withoutEvents) {
      return returnPromise.catch(() => {
        PandaBridge.send('requestFailed');
      });
    } else {
      return returnPromise;
    }
  }

  doRequest(properties, withoutEvents = false) {
    if (properties) {
      this.updateProperties(properties);
    }
    this.resetPagination();
    return this.initPromise.then(() => {
      return this.processResponse(this.pandaFetch.doRequest(), withoutEvents);
    });
  }

  doRequests(properties) {
    return this.initPromise.then(async () => {
      let [data, schema] = await this.doRequest(properties, true);
      let nextPageResult;

      while ((nextPageResult = await this.nextPage(properties, true))) {
        [data, schema] = nextPageResult;
      }
      return this.sendPandaEvents([data, schema]);
    });
  }

  resetPagination() {
    this._pagination.offsets = [];
    this._pagination.index = 0;
    this._pagination.pointerData = [];
    this.pandaFetch.customQuery = {};
  }

  getPaginationIndex() {
    return this._pagination.index;
  }

  clearCache(properties) {
    if (properties) {
      this.updateProperties(properties);
    }
    return this.initPromise.then(() => {
      return this.pandaFetch.clearResponseCache();
    });
  }

  redoRequests(properties) {
    if (properties) {
      this.updateProperties(properties);
    }
    return this.initPromise.then(() => {
      return this.pandaFetch.redoRequests();
    });
  }

  nextPage(properties, withoutEvents = false) {
    let promise = Promise.resolve();

    if (properties) {
      this.updateProperties(properties);
    }
    const keyOffset = this.getKeyOffset();

    if (keyOffset) {
      const name = last(keyOffset.name);
      const offsetValue = this._pagination.offsets[this._pagination.index];

      if (offsetValue) {
        this.pandaFetch.setQueryParam(name, offsetValue);
        promise = this.processResponse(this.pandaFetch.doRequest(), withoutEvents);
        this._pagination.index += 1;
      } else {
        this.pandaFetch.removeQueryParam(name);
        if (offsetValue !== null) { // last page
          promise = this.processResponse(this.pandaFetch.doRequest(), withoutEvents);
        }
      }
    }
    return promise;
  }

  prevPage(properties, withoutEvents = false) {
    let promise = Promise.resolve();

    if (properties) {
      this.updateProperties(properties);
    }
    const keyOffset = this.getKeyOffset();

    if (keyOffset) {
      if (this._pagination.offsets[this._pagination.index] === null) { // Last page
        this._pagination.index -= 1;
      }

      const name = last(keyOffset.name);
      const offsetValue = this._pagination.offsets[this._pagination.index - 1];

      if (offsetValue) {
        this.pandaFetch.setQueryParam(name, offsetValue);
        promise = this.processResponse(this.pandaFetch.doRequest(), withoutEvents);
        this._pagination.index -= 1;
      } else {
        const executeRequest = this.pandaFetch.customQuery[name] !== undefined;

        this.pandaFetch.removeQueryParam(name);
        if (executeRequest) {
          promise = this.processResponse(this.pandaFetch.doRequest(), withoutEvents);
        }
      }
    }
    return promise;
  }
}

const singletonInstance = new FetchHandler();

export const FetchHandlerConstructor = FetchHandler;

export default singletonInstance;
