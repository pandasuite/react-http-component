import PandaBridge from 'pandasuite-bridge';
import localForage from 'localforage';
import * as sessionStorageDriver from 'localforage-driver-session-storage';
import { merge } from 'lodash';
import { parse } from './utils/json';

const originalFetch = require('isomorphic-fetch');
const fetch = require('fetch-retry')(originalFetch);

export default class PandaFetch {
  constructor(properties) {
    this.properties = properties;
    this.uniqueId = (properties || {})[PandaBridge.UNIQUE_ID];

    const method = properties.method.toLowerCase();
    const requestHaveBody = ['get', 'head'].indexOf(method) === -1;

    const options = {
      headers: merge(properties.headers, {
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

    const url = new URL(this.properties.url);
    const queryString = new URLSearchParams(this.properties.query || {}).toString();
    this.url = `${url.origin}${url.pathname}?${queryString}`;

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

  getStorageKey() {
    return `${this.url}${JSON.stringify(this.options)}`;
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
    const sendCompletedEvent = (data) => {
      PandaBridge.send('requestCompleted', [{ data: parse(data) }]);
      PandaBridge.send(PandaBridge.UPDATED, {
        queryable: parse(data),
      });
    };

    const sendFailedEvent = () => {
      PandaBridge.send('requestFailed');
    };

    const fetchRequest = () => {
      return fetch(this.url, merge(this.options, {
        retryOn: (attempt, error, response) => attempt < 3 && response && response.status >= 500,
        retryDelay: (attempt) => (2 ** attempt) * 1000,
      }))
        .then(async (response) => {
          if (response.ok) {
            const data = await response.text();
            if (this.properties.cache !== 'none') {
              this.responsesStore.setItem(this.getStorageKey(), data);
            }
            sendCompletedEvent(data);
          } else {
            sendFailedEvent();
          }
        });
    };

    this.getCachedResponse()
      .then((cachedData) => {
        if (this.properties.cache === 'cacheFirst') {
          sendCompletedEvent(cachedData);
        } else {
          fetchRequest().catch(() => {
            sendCompletedEvent(cachedData);
          });
        }
      })
      .catch(() => {
        fetchRequest().catch(() => {
          this.addFailedRequest();
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
    this.responsesStore.clear();
  }
}
