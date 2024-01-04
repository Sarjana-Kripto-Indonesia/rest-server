const doc_listener = firebase.collection('listener_test').doc('Q7ajG5muvYsb22F6OX28');
const observer = doc_listener.onSnapshot(docSnapshot => {
    console.log(`Received doc snapshot`);
    let data = docSnapshot.data();
}, err => {
    console.log(`Encountered error: ${err}`);
});

