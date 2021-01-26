import each from 'lodash/each';
import merge from 'lodash/merge';
import pick from 'lodash/pick';

import { FetchHandlerConstructor } from './FetchHandler';
import { parse } from './utils/json';

const pointer = require('json-pointer');

export default class OfflineFetchHandler {
  constructor(properties) {
    this.requests = [];
    this.fetchHandler = new FetchHandlerConstructor();
    this.fetchHandler.updateProperties(merge({ cache: 'none' }, properties));

    this.fetchHandler.setSuccessCallback((data, error) => {
      if (error) {
        this.reject();
        return false;
      }

      const schema = parse(data) || {};
      const paginationIndex = this.fetchHandler.getPaginationIndex() + 1;

      const url = this.fetchHandler.pandaFetch.getUrl();

      this.requests.push({
        id: url,
        type: 'JSON',
        request: merge({
          url,
          force: true, // Force the request to be updated
        }, pick(this.fetchHandler.pandaFetch.options, ['method', 'headers', 'body'])),
        data: {
          name: `request${paginationIndex}`,
          sk: this.fetchHandler.pandaFetch.getStorageKey(),
        },
      });

      const dict = pointer.dict(schema);

      each(properties.keys, (key) => {
        if (key.type === 'image') {
          const regex = new RegExp(`/${key.name.join('/([0-9]+/)?')}`);

          each(dict, (v, k) => {
            if (k.match(regex)) {
              this.requests.push({
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

      if (!this.fetchHandler.nextPage()) {
        this.resolve(this.requests);
      }
      return true;
    }, false);
  }

  doAllRequest() {
    return new Promise((resolve, reject) => {
      this.requests = [];
      this.resolve = resolve;
      this.reject = reject;

      this.fetchHandler.doRequest();
    });
  }
}
