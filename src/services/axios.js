/**
 * Hub service
 *
 *  Accommodate api calls as main communication between services (servers)
 */

const axios = require("axios").default;

class Hub {
  constructor() {
    this.axios = axios;
    this.server = process.env.SERVER;
  }

  /**
   * Call api for testing
   *
   * @param url String => /user/test
   * @param method String => get, post, put, delete
   * @param data Object
   * @param query String => key=value&key=value
   * @return AXIOS Promise
   */
  testRequest(_url, method, data = null, query = null) {
    let url = this.server + _url;
    if (query) {
      url += `?${query}`;
    }
    return this.axios({
      headers: {
        "master-authorization": process.env.MASTER_API_KEY,
      },
      method: method,
      url: url,
      data: data,
    });
  }
}

module.exports = new Hub();

