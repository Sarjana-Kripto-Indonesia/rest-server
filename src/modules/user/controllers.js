var fs = require('fs');
const isNumber = ['count_symbols', 'count_bots']; 

exports.getControllers = async function (req, callback) {
    let query = [];
    for (let key in req.query) {
        query.push(key);
        if (isNumber.indexOf(key) !== -1) {
            console.log(`${key} has to be Number`)
            query.push(parseFloat(req.query[key]));
        } else {
            console.log(`${key} has to be String`)
            query.push(req.query[key].toString());
        }
    }
    console.log(query);
    if (query.length > 0) {                         // WITH QUERY
        if (query[0].toString() == 'id') {  //get specific id
            let getData = firebase.collection("controllers").doc(query[1].toString());
            let doc     = await getData.get();
            let data  = doc.data();
            return callback(data);
        } else {                            //dynamic query
            firebase.collection("controllers")
                .where(query[0].toString(), "==", query[1])
                .get().then(reply => {
                    let data = [];
                    reply.forEach(doc => {
                        data.push({ ...doc.data(), id: doc.id })
                    })
                    return callback(data);
                })
        }
    } else {                                        //WITHOUT QUERY
        firebase.collection("controllers")
            .get().then(reply => {
                let data = [];
                reply.forEach(doc => {
                    data.push({ ...doc.data(), id: doc.id })
                })
                return callback(data);
            })   
    }
}