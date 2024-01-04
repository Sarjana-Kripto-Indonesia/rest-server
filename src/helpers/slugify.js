/**
 * Method to slugify string
 */

/**
 *
 * @param {*} string
 * @returns
 */
function createSlug(string) {
  return string.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
}


module.exports = { createSlug }