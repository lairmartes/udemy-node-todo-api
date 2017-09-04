//const MongoClient = require('mongodb').MongoClient;
const { MongoClient, ObjectID } = require('mongodb');

MongoClient.connect('mongodb://localhost:27017/TodoApp', (err, db) => {
    if (err) {
        return console.log('Unable to connect to MongoDB server');
    }
    console.log('Connected to MongoDB server');

    /*     db.collection('Todos').findOneAndUpdate({
            _id: new ObjectID('599bf3ddabd90f2a4e4c7089')
        }, {
            $set: {
                completed: true
            }
        }, {
            returnOriginal: false
        }).then((result) => {
            console.log(result);
        });
     */

    db.collection('Users').findOneAndUpdate({
        _id: new ObjectID('599be978cab6d47548ed65f8')
    }, {
        $set: {
            name: 'Lair'
        },
        $inc: {
            age: 30
        }
    }, {
        returnOriginal: false
    }).then((result) => {
        console.log(result);
    });

    //db.close();
});