/* eslint-disable no-underscore-dangle */
import PandaBridge from 'pandasuite-bridge';
import localForage from 'localforage';
import * as sessionStorageDriver from 'localforage-driver-session-storage';

import merge from 'lodash/merge';
import assign from 'lodash/assign';

const originalFetch = require('isomorphic-fetch');
const fetch = require('fetch-retry')(originalFetch);

export default class PandaFetch {
  constructor(properties) {
    if (properties) {
      this.properties = properties;
    }
  }

  set properties(properties) {
    this._properties = properties;
    this.uniqueId = (properties || {})[PandaBridge.UNIQUE_ID];

    const method = properties.method.toLowerCase();
    const requestHaveBody = ['get', 'head'].indexOf(method) === -1;

    const options = {
      headers: merge({}, properties.headers, {
        'Content-Type': properties.contentType,
      }),
      method: properties.method,
      body: requestHaveBody ? properties.content : undefined,
      responseType: 'text',
    };

    if (properties.user && properties.password) {
      options.headers.Authorization = `Basic ${btoa(`${properties.user}:${properties.password}`)}`;
    }
    this.options = options;

    this.requestsStore = localForage.createInstance({
      name: 'requestsStore',
      storeName: this.uniqueId,
    });

    localForage.defineDriver(sessionStorageDriver);

    this.responsesStore = localForage.createInstance({
      name: 'responsesStore',
      // eslint-disable-next-line no-underscore-dangle
      driver: properties.persistent ? localForage.INDEXEDDB : sessionStorageDriver._driver,
      storeName: this.uniqueId,
    });
  }

  get properties() {
    return this._properties;
  }

  getUrl() {
    const url = new URL(this.properties.url);
    const queryString = new URLSearchParams(
      assign({}, this.properties.query || {}, this.customQuery || {}),
    ).toString();
    return `${url.origin}${url.pathname}?${queryString}`;
  }

  getStorageKey() {
    return `${this.getUrl()}${JSON.stringify(this.options)}`;
  }

  getCachedResponse() {
    return new Promise((resolve, reject) => {
      if (this.properties.cache === 'none') {
        reject();
      } else {
        this.responsesStore.getItem(this.getStorageKey())
          .then((data) => {
            if (data == null) {
              reject();
            } else {
              resolve(data);
            }
          });
      }
    });
  }

  doRequest() {
    return new Promise((resolve, reject) => {
      const fetchRequest = () => fetch(this.getUrl(), merge({}, this.options, {
        retryOn: (attempt, error, response) => attempt < 3 && response && response.status >= 500,
        retryDelay: (attempt) => (2 ** attempt) * 1000,
      }))
        .then(async (response) => {
          if (response.ok) {
            const data = await response.text();
            if (this.properties.cache !== 'none') {
              this.responsesStore.setItem(this.getStorageKey(), data);
            }
            resolve(data);
          } else {
            reject(response.error);
          }
        });

      this.getCachedResponse()
        .then((cachedData) => {
          if (this.properties.cache === 'cacheFirst') {
            resolve(cachedData);
          } else {
            fetchRequest().catch(() => {
              resolve(cachedData);
            });
          }
        })
        .catch(() => {
          fetchRequest().catch(() => {
            this.addFailedRequest();
          });
        });
    });
  }

  async addFailedRequest() {
    this.requestsStore.setItem(this.getStorageKey(), this.properties);
  }

  async redoRequests() {
    this.requestsStore.keys()
      .then((keys) => {
        Promise.all(keys.map((key) => this.requestsStore.getItem(key))).then(async (requests) => {
          await this.requestsStore.clear();

          if (Array.isArray(requests)) {
            requests.forEach((request) => {
              const pandaFetch = new PandaFetch(request);
              pandaFetch.doRequest();
            });
          }
        });
      });
  }

  clearResponseCache() {
    return this.responsesStore.clear();
  }

  setQueryParam(name, value) {
    this.customQuery = merge(this.customQuery || {}, { [name]: value });
  }

  removeQueryParam(name) {
    delete this.customQuery[name];
  }
}
