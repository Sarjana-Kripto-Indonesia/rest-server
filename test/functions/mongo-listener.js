const Listener = require("./src/models/test_listener")
Listener.watch().on('change', data => {
    let update = data.updateDescription.updatedFields;
    // calculate
    // emit position to client
    // global.io.emit('position', {hello:"world"})
    // global.io.emit('position', update);
});

setInterval(async () => {
    let doc = await Listener.findOne();
    // let randomizedValue = Math.floor(Math.random() * 10);
    doc.value = Math.floor(Math.random() * 10);
    await doc.save()
}, 2000)
