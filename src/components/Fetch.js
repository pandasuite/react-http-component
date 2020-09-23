import {
  useImperativeHandle, forwardRef, useEffect, useRef,
} from 'react';

import useOnlineStatus from '@rehooks/online-status';
import usePrevious from '../hooks/usePrevious';
import PandaFetch from '../PandaFetch';

const Fetch = forwardRef((props, ref) => {
  const { properties } = props;

  const pandaFetchRef = useRef();
  const onlineStatus = useOnlineStatus();
  const prevStatus = usePrevious(onlineStatus);

  const doRequest = () => {
    pandaFetchRef.current.doRequest();
  };

  const clearCache = () => {
    pandaFetchRef.current.clearCache();
  };

  const redoRequests = () => {
    pandaFetchRef.current.redoRequests();
  };

  useImperativeHandle(ref, () => ({
    doRequest,
    clearCache,
    redoRequests,
  }));

  pandaFetchRef.current = new PandaFetch(properties);

  if (prevStatus === false && onlineStatus === true) {
    pandaFetchRef.current.redoRequests();
  }

  useEffect(() => {
    pandaFetchRef.current.redoRequests();
  }, []);

  return null;
});

export default Fetch;
