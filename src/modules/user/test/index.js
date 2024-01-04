require('dotenv').config()
const { expect, assert } = require("chai");
const Hub = require("../../../services/axios")

describe("Checking User Test", () => {
  it("Test endpoint", async function () {
    const res = await Hub.testRequest("/user/test", "get", null, null);
    expect(res.data.msg).to.equal("hello");
  });
});