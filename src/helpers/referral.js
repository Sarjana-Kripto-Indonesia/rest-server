module.exports = (id) => {
    let prefix = "SKI"
    let result = `${prefix}-${id.toString().slice(-6)}`
    return result    
}