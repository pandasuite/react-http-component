// eslint-disable-next-line import/prefer-default-export
export const fetchLocal = (url) => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();

    xhr.onload = function() {
      resolve(new Response(xhr.responseText, { status: 200 }))
    };

    xhr.onerror = function() {
      reject(new TypeError('Local request failed'));
    }
    xhr.open('GET', url);
    xhr.send(null);
  });
};
