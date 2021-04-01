export const parse = (str) => {
  let body;

  try {
    body = JSON.parse(str);
  // eslint-disable-next-line no-empty
  } catch (e) {}
  return body;
};

export const stringify = (body) => {
  if (typeof body === 'string') {
    return body;
  }

  let str;

  try {
    str = JSON.stringify(body);
  // eslint-disable-next-line no-empty
  } catch (e) {}
  return str;
};
