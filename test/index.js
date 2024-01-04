/**
 * Unit testing executables
 *
 * Support multi modules testing
 */

require("dotenv").config();
require("../src/config/database")

const Hub = require("../src/services/axios")
// eslint-disable-next-line node/no-unpublished-require
const { expect } = require("chai");


// describe("Checking Version", () => {
//   it("Check test module", async function () {
//     const res = await Hub.testRequest("/info", "get", null, null);
//     expect(res.data.description).to.equal("Rest api server for ZokuLaunch");
//   });
// });

if (process.argv.length > 3) {
  require(`../src/modules/${process.argv.slice(3)}/test`);
} else {
  // New modules goes here
  require(`../src/modules/user/test`)
  require(`../src/modules/admin/project/test`)
}