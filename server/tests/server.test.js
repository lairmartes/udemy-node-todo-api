const expect = require('expect'); // assertions from mjackson
const request = require('supertest'); // https assertions
const { ObjectID } = require('mongodb'); // mongodb driver

const { app } = require('./../server'); // nodejs myserver instance
const { Todo } = require('./../models/todo'); // json dataclass of tasks todo
const { User } = require('./../models/user');
const { todos, populateTodos, users, populateUsers } = require('./seed/seed');

// preparing database for testing - input todos array created above in mongodb database
beforeEach(populateUsers);
beforeEach(populateTodos);

// test POST REST method
describe('POST /todos', () => {
    it('should create a new todo', (done) => { // callback function receiveing request content (var "done")

        /* text used for testing (defining variable name with the same name 
           of the json property it's not required to include the property name
           in the string */
        var text = 'Test todo text';

        request(app) // get app server instance
            .post('/todos') // execute a post in /todos method
            .set('x-auth', users[0].tokens[0].token) // authenticate the user
            .send({ text }) // send data
            .expect(200) // expecting everything is done
            .expect((res) => { // test the response sending this callback function
                expect(res.body.text).toBe(text); // just check if the same text is returned
            })
            .end((err, res) => {
                /* finishing test with two callback functions, 
                                                   one for error and other if ok */
                if (err) {
                    return done(err); // warning about error if has been detected
                }

                // check if the todo inputed can be found in Todo's database
                Todo.find({ text }).then((todos) => { // query todos with text used in this test
                    expect(todos.length).toBe(1);
                    /* only one todo with text description should be find,
                                                                        since database is cleared before test */
                    expect(todos[0].text).toBe(text);
                    /* the only existing todo should contain the 
                                                                            tested description */
                    done(); // signs the test is completed
                }).catch((e) => done(e)); // warning about errors if something goes wrong
            });
    });

    it('should not create todo with invalid body data', (done) => {
        request(app)
            .post('/todos')
            .set('x-auth', users[0].tokens[0].token)
            .send({}) // send an empty todo
            .expect(400) // it's not supposed to work and a bad request (client error) should raise
            .end((err, res) => {
                if (err) {
                    return done(err); //warning in case if it accepts or server error
                }

                Todo.find().then((todos) => {
                    expect(todos.length).toBe(2);
                    /* should contain only the two todos created,
                                                                        since all todos are cleared before each test */
                    done();
                }).catch((e) => done(e));
            });
    });

});

// test GET REST method
describe('GET /todos', () => { // getting all todos in mongodb
    it('should get all todos', (done) => { // call back function receiving response content in "done"
        request(app) // call server url
            .get('/todos') // request all todos from mongodb
            .set('x-auth', users[0].tokens[0].token)
            .expect(200) // things are supposed to work...
            .expect((res) => {
                /* test response with callback function that receives content 
                                                 in variable "res" */
                expect(res.body.todos.length).toBe(1); // get todos only for the authenticated user
                /* it's supposed to have only the two todos,
                                                                         since all todos are cleared before each test */
            })
            .end(done);
    });
});

describe('GET /todos/:id', () => { // getting a specific todo
    it('should return todo doc', (done) => {
        request(app)
            // get todo from mongodb using the id in the first of the todo array created for all tests
            .get(`/todos/${todos[0]._id.toHexString()}`)
            // set user authentication
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(todos[0].text);
                /* the todo description recovered from
                   mongodb should be the same of the
                   first item of todo array */
            })
            .end(done);
    });

    it('should not return a todo doc created by other user', (done) => {
        request(app)
            // get todo from mongodb using the id in the second of the todo array created for all tests,...
            .get(`/todos/${todos[1]._id.toHexString()}`)
            // ...but we will try to get this data using the token created for the first user...
            .set('x-auth', users[0].tokens[0].token)
            // ...and it's not supposed to work, since we are trying to get todo from the second user...
            // ...using first user credentials.  So, we will receive a NOT FOUND error.
            .expect(404)
            .end(done);
    });

    it('should return 404 if todo not found', (done) => {
        // make sure you get a 404 
        noExistingId = new ObjectID();
        request(app)
            .get(`/todos/${noExistingId.toHexString()}`)
            .set('x-auth', users[0].tokens[0].token)
            .expect(404)
            .end(done);
    });

    it('should return 404 for non-object ids', (done) => {
        // define an id that is not valid
        invalidId = '12345';
        request(app)
            // try to get todo data using the invalid id
            .get(`/todos/${invalidId}`)
            .set('x-auth', users[0].tokens[0].token)
            // it's not supposed to work
            .expect(404)
            .end(done);
    });

});


describe('DELETE /todos/:id', () => {
    it('should remove a todo', (done) => {
        var hexId = todos[1]._id.toHexString();

        request(app)
            .delete(`/todos/${hexId}`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo._id).toBe(hexId);
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                Todo.findById(hexId).then((todo) => {
                    expect(todo).toNotExist();
                    done();
                }).catch((e) => done(e));
            });
    });

    it('should not remove a todo created by other user', (done) => {
        var hexId = todos[0]._id.toHexString();

        request(app)
            .delete(`/todos/${hexId}`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(404)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                Todo.findById(hexId).then((todo) => {
                    expect(todo).toExist();
                    done();
                }).catch((e) => done(e));
            });
    });

    it('should return 404 if todo not found', (done) => {
        var hexId = new ObjectID().toHexString();

        request(app)
            .delete(`/todos/${hexId}`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(404)
            .end(done);

    });

    it('should return 404 if object id is invalid', (done) => {
        request(app)
            .delete(`/todos/123abc`)
            .set('x-auth', users[1].tokens[0].token)
            .expect(404)
            .end(done);
    });
});

describe('PATCH /todos/:id', () => {
    it('should update the todo', (done) => {
        var hexId = todos[0]._id.toHexString(); // get the id of the first item of todo array
        var text = 'Updated description'; // create string to update database
        // auth as first user - nothing need to be change
        request(app)
            .patch(`/todos/${hexId}`)
            .set('x-auth', users[0].tokens[0].token)
            .send({
                completed: true,
                text
                /* Important note: if you define the name of the variable the same name of the json
                                   property, you don't need to include the property name being updated */
            }) // send completed as true
            .expect(200) // things must go well...
            .expect((res) => { // let's check if completed is true AND data of completion is ok
                expect(res.body.todo.text).toBe(text);
                expect(res.body.todo.completed).toBe(true); // is really true
                expect(res.body.todo.completedAt).toBeA('number'); // is a number
            })
            .end(done);
    });

    it('should not update the todo by other user', (done) => {
        var hexId = todos[0]._id.toHexString(); // get the id of the first item of todo array
        var text = 'Updated description'; // create string to update database
        // auth as first user - nothing need to be change
        request(app)
            .patch(`/todos/${hexId}`)
            .set('x-auth', users[1].tokens[0].token) // send the token from further user
            .send({
                completed: true,
                text
                /* Important note: if you define the name of the variable the same name of the json
                                   property, you don't need to include the property name being updated */
            }) // send completed as true
            .expect(404) // things must NOT go well since the todo belongs to other user...
            .end(done);
    });

    it('shoud clear completedAt when todo is note completed', (done) => {
        var hexId = todos[1]._id.toHexString(); // get the id of the item already completed
        var text = 'Updated the completed todo';
        // authenticate with the second user
        request(app)
            .patch(`/todos/${hexId}`)
            .set('x-auth', users[1].tokens[0].token)
            .send({
                completed: false,
                text
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(text);
                expect(res.body.todo.completed).toBe(false);
                // completed data is supposed to be null
                expect(res.body.todo.completedAt).toBe(null);
            })
            .end(done);
    });

});


// test User services

describe('GET /users/me', () => {
    it('should return user if authenticated', (done) => {
        request(app)
            .get('/users/me')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body._id).toBe(users[0]._id.toHexString());
                expect(res.body.email).toBe(users[0].email);
            })
            .end(done);
    });

    it('should return 401 if not authenticated', (done) => {
        request(app)
            .get('/users/me')
            .expect(401)
            .expect((res) => {
                expect(res.body).toEqual({});
            })
            .end(done);
    });
});

describe('POST /users', () => {
    it('should create a user', (done) => {
        var email = 'example@example.com';
        var password = '123mnb!';

        request(app)
            .post('/users')
            .send({ email, password })
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toExist();
                expect(res.body._id).toExist();
                expect(res.body.email).toBe(email);
            })
            .end((err) => {
                if (err) {
                    return done(err);
                }
                User.findOne({ email }).then((user) => {
                    expect(user).toExist();
                    //check if password has been encrypted
                    expect(user.password).toNotBe(password);
                    done();
                });
            });

    });

    it('shold return validation errors if request invalid', (done) => {

        request(app)
            .post('/users')
            .send({
                email: 'and',
                password: '123'
            })
            .expect(400) //bad request
            .end(done);
    });

    it('should not create user if email in use', (done) => {
        var email = users[1].email;
        var password = '123abc!';

        request(app)
            .post('/users')
            .send({ email, password })
            .expect(400) // bad request since e-mail already exists
            .end(done);
    });
});

describe('POST /users/login', () => {
    it('should login user and return auth token', (done) => {
        request(app)
            .post('/users/login')
            .send({
                email: users[1].email,
                password: users[1].password
            })
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toExist();
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[1]._id).then((user) => {
                    // A token has already exist. Checking if the created now has been included.
                    expect(user.tokens[1]).toInclude({
                        access: 'auth',
                        token: res.headers['x-auth']
                    });
                    done();
                }).catch((e) => done(e));
            });
    });

    it('shoudl reject invalid login', (done) => {
        request(app)
            .post('/users/login')
            .send({
                email: users[1].email + '1',
                password: users[1].password
            })
            .expect(400)
            .expect((res) => {
                expect(res.headers['x-auth']).toNotExist();
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[1]._id).then((user) => {
                    // It should contains the token created in the seed.
                    expect(user.tokens.length).toBe(1);
                    done();
                }).catch((e) => done(e));
            });
    });

});

describe('DELETE /users/me/token', () => {
    it('should remove auth token on logout', (done) => {
        request(app)
            .delete('/users/me/token')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200) // delete method must be completed without errors
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                User.findById(users[0]._id).then((user) => {
                    expect(user.tokens.length).toBe(0); // must have no tokens in users[0]
                    done();
                }).catch((e) => done(e));
            });
    });
});