require('./config/config.js'); // set up environemnt before start
const _ = require('lodash'); // supporting libraries
const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');

var mongoose = require('./db/mongoose');
var { Todo } = require('./models/todo');
var { User } = require('./models/user');
var { authenticate } = require('./middleware/authenticate');

var app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

/* Todo services */

app.post('/todos', authenticate, (req, res) => {
    var todo = new Todo({
        text: req.body.text,
        _creator: req.user._id
    });

    todo.save().then((doc) => {
        res.send(doc);
    }, (e) => {
        res.status(400).send(e);
    });
});

app.get('/todos', authenticate, (req, res) => {
    Todo.find({
        _creator: req.user._id
    }).then((todos) => {
        res.send({ todos });
    }, (e) => {
        res.status(400).send(e);
    });
});

app.get('/todos/:id', authenticate, (req, res) => {
    // getting todo id from URL param
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    Todo.findOne({
        _id: id,
        _creator: req.user._id // grant that the todo requested belongs to the user
    }).then((todo) => {
        if (!todo) {
            return res.status(404).send();
        }

        res.status(200).send({ todo });
    }).catch((e) => {
        res.status(400).send();
    });
});

app.delete('/todos/:id', authenticate, async(req, res) => {

    try {
        // get the id from request data
        const id = req.params.id;
        // return bad request if id sent is not valid (syntatically)
        if (!ObjectID.isValid(id)) {
            res.status(404).send();
        }
        // remove the todo record and return 'undefined' if no record has been found
        const todo = await Todo.findOneAndRemove({
            _id: id,
            _creator: req.user._id
        });
        // return bad request if no todo has been found to be removed
        if (!todo) {
            res.status(404).send();
        } /* return the record removed in case of success */
        else {

            res.send({ todo });
        }
    } catch (e) {
        // return a server error in case of something goes wrong during this operation.
        res.status(500).send();
    }
});

app.patch('/todos/:id', authenticate, (req, res) => {
    var id = req.params.id;
    var body = _.pick(req.body, ['text', 'completed']); // lodash used here for getting todo data from string

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    if (_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
    }

    Todo.findOneAndUpdate({ // query parameters (id and creator)
            _id: id,
            _creator: req.user._id
        }, { $set: body }, // data to be updated (comming from request )
        { new: true }).then((todo) => {
        if (!todo) {
            return res.status(404).send();
        }

        res.send({ todo });

    }).catch((e) => {
        res.status(400).send();
    });
});

/* User services */

app.post('/users', async(req, res) => {
    try {
        // getting user data from request
        const body = _.pick(req.body, ['email', 'password']);
        // create a mongodb user with body data
        const user = new User(body);
        // try to save user
        await user.save();
        // after saving the user, includes token data calling user method
        token = await user.generateAuthToken();
        // send token back to the caller
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send(e); // bad request if data is not correct
    }
});

// GET service to get a user by token
// Call "authenticate".  If not valid authentication, authenticate method will raise a 401 HTTP error
app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});

//POST /users/login {email, password}
app.post('/users/login', async(req, res) => {

    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = await User.findByCredentials(body.email, body.password);
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send();
    }

});

app.delete('/users/me/token', authenticate, async(req, res) => {
    try {
        await req.user.removeToken(req.token);
        res.status(200).send();
    } catch (e) {
        res.status(400).send();
    }
});

app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

module.exports = { app };