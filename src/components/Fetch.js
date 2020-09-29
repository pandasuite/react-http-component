import { useEffect } from 'react';

import useOnlineStatus from '@rehooks/online-status';
import { useSetRecoilState } from 'recoil';

import usePrevious from '../hooks/usePrevious';
import FetchHandler from '../FetchHandler';
import resultAtom from '../atoms/Result';

function Fetch(props) {
  const { properties } = props;

  const onlineStatus = useOnlineStatus();
  const prevStatus = usePrevious(onlineStatus);
  const setResult = useSetRecoilState(resultAtom);

  FetchHandler.updateProperties(properties);
  FetchHandler.setSuccessCallback((data) => {
    setResult(data);
  });

  if (prevStatus === false && onlineStatus === true) {
    FetchHandler.redoRequests();
  }

  useEffect(() => {
    FetchHandler.redoRequests();
  }, []);

  return null;
}

export default Fetch;
