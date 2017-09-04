const { ObjectID } = require('mongodb');

const { mongoose } = require('./../server/db/mongoose');
const { Todo } = require('./../server/models/todo');
const { User } = require('./../server/models/user');

var id = '599d546a9080691492549ce1';
/*
if (!ObjectID.isValid(id)) {
    console.log('ID not valid');
}
 */
/* 
Todo.find({
    _id: id
}).then((todos) => {
    console.log('Todos', todos);
});

Todo.findOne({
    _id: id
}).then((todo) => {
    console.log('Todo', todo);
});
 */
/* 
Todo.findById(id).then((todo) => {
    if (!todo) {
        return console.log('Id not found');
    }
    console.log('Todo by Id', todo);
}).catch((e) => console.log(e));
 */
// User.findById
if (!ObjectID.isValid(id)) {
    return console.log('User id not valid');
}
User.findById(id).then((user) => {
    if (!user) {
        return console.log(`User with id ${id} not found`);
    }
    console.log('User by ID', user);
}, (e) => {
    console.log(e);
});