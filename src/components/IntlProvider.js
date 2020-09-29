import React from 'react';
import { IntlProvider as NativeIntlProvider } from 'react-intl';

import messagesEn from '../constants/intl/en.json';
import messagesFr from '../constants/intl/fr.json';

const IntlProvider = (props) => {
  // eslint-disable-next-line react/prop-types
  const { children } = props;
  let locale = navigator.language.substring(0, 2);

  if (locale !== 'fr') {
    locale = 'en';
  }
  const localizedMessages = {
    fr: messagesFr,
    en: messagesEn,
  };

  return (
    <NativeIntlProvider locale={locale} messages={localizedMessages[locale]} textComponent={<></>}>
      { children }
    </NativeIntlProvider>
  );
};

export default IntlProvider;
