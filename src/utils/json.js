// eslint-disable-next-line import/prefer-default-export
export const parse = (str) => {
  let body;

  try {
    body = JSON.parse(str);
  // eslint-disable-next-line no-empty
  } catch (e) {}
  return body;
};
