import each from 'lodash/each';
import map from 'lodash/map';
import assign from 'lodash/assign';
import pick from 'lodash/pick';
import omit from 'lodash/omit';

import { FetchHandlerConstructor } from './FetchHandler';

const pointer = require('json-pointer');

export default class OfflineFetchHandler {
  _requests = [];

  constructor(properties) {
    this.properties = properties;

    this.fetchHandler = new FetchHandlerConstructor();
    this.fetchHandler.updateProperties(assign({}, properties, {
      cache: 'none',
      keys: this.removeOffsetPointer(properties.keys)
    }));
  }

  removeOffsetPointer = (keys) => {
    if (keys) {
      return map(keys, (k) => {
        if (k.type === 'offset') {
          return omit(k, ['pointer']);
        }
        return k;
      });
    }
    return keys;
  }

  createRequestFromResponse(response) {
    return new Promise(async (resolve) => {
      if (response) {
        const [, schema] = response;

        const paginationIndex = this.fetchHandler.getPaginationIndex() + 1;

        const url = this.fetchHandler.pandaFetch.getUrl();
  
        this._requests.push({
          id: url,
          type: 'JSON',
          request: assign({
            url,
            force: true, // Force the request to be updated
          }, pick(this.fetchHandler.pandaFetch.options, ['method', 'headers', 'body'])),
          data: {
            name: `request${paginationIndex}`,
            sk: this.fetchHandler.pandaFetch.getStorageKey(),
            offset: this.fetchHandler.getKeyOffsetValue(schema),
          },
        });

        const dict = pointer.dict(schema);
  
        each(this.properties.keys, (key) => {
          if (key.type === 'image') {
            const regex = new RegExp(`/${key.name.join('/([0-9]+/)?')}`);
  
            each(dict, (v, k) => {
              if (k.match(regex)) {
                this._requests.push({
                  id: v,
                  type: 'Image',
                  request: {
                    url: v,
                    method: 'GET',
                  },
                  data: {
                    name: `request${paginationIndex}${k}`,
                  },
                });
              }
            });
          }
        });
      }
      resolve(response);
    });
  }

  doAllRequest() {
    this._requests = [];

    return new Promise(async (resolve) => {
      let needLooping = true;

      await this.fetchHandler.doRequest(undefined, true)
        .then(this.createRequestFromResponse.bind(this));
        
      while (needLooping) {
        needLooping = await this.fetchHandler.nextPage(undefined, true)
          .then(this.createRequestFromResponse.bind(this));
      }
      resolve(this._requests);
    });
  }
}
