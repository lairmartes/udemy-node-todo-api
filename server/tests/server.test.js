const expect = require('expect'); // assertions from mjackson
const request = require('supertest'); // https assertions
const { ObjectID } = require('mongodb'); // mongodb driver

const { app } = require('./../server'); // nodejs myserver instance
const { Todo } = require('./../models/todo'); // json dataclass of tasks todo

// array of todos to be used in tests
const todos = [{
    _id: new ObjectID(),
    text: 'First test todo'
}, {
    _id: new ObjectID(),
    text: 'Second test todo',
    completed: true,
    completedAt: 333
}];

// preparing database for testing - input todos array created above in mongodb database
beforeEach((done) => {
    // clear database and, if ok, insert todos
    Todo.remove({}).then(() => {
        return Todo.insertMany(todos);
    }).then(() => done());
});

// test POST REST method
describe('POST /todos', () => {
    it('should create a new todo', (done) => { // callback function receiveing request content (var "done")

        /* text used for testing (defining variable name with the same name 
           of the json property it's not required to include the property name
           in the string */
        var text = 'Test todo text';

        request(app) // get app server instance
            .post('/todos') // execute a post in /todos method
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
            .expect(200) // things are supposed to work...
            .expect((res) => {
                /* test response with callback function that receives content 
                                                 in variable "res" */
                expect(res.body.todos.length).toBe(2);
                /* it's supposed to have only the two todos,
                                                                         since all todos are cleared before each test */
            })
            .end(done);
    });
});

describe('GET /todos/:id', () => { // getting a specific todo
    it('should return todo doc', (done) => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString()}`)
            /* get todo from mongodb using the id in the first 
                                                                       of the todo array created for all tests */
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(todos[0].text);
                /* the todo description recovered from
                                                                                  mongodb should be the same of the
                                                                                  first item of todo array */
            })
            .end(done);
    });

    it('should return 404 if todo not found', (done) => {
        // make sure you get a 404 
        noExistingId = new ObjectID();
        request(app)
            .get(`/todos/${noExistingId.toHexString()}`)
            .expect(404)
            .end(done);
    });

    it('should return 404 for non-object ids', (done) => {
        // /todos/123
        invalidId = '12345';
        request(app)
            .get(`/todos/${invalidId}`)
            .expect(404)
            .end(done);
    });

});


describe('DELETE /todos/:id', () => {
    it('should remove a todo', (done) => {
        var hexId = todos[1]._id.toHexString();

        request(app)
            .delete(`/todos/${hexId}`)
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

    it('should return 404 if todo not found', (done) => {
        var hexId = new ObjectID().toHexString();

        request(app)
            .delete(`/todos/${hexId}`)
            .expect(404)
            .end(done);

    });

    it('should return 404 if object id is invalid', (done) => {
        request(app)
            .delete(`/todos/123abc`)
            .expect(404)
            .end(done);
    });
});

describe('PATCH /todos/:id', () => {
    it('should update the todo', (done) => {
        var hexId = todos[0]._id.toHexString(); // get the id of the first item of todo array
        var text = 'Updated description'; // create string to update database

        request(app)
            .patch(`/todos/${hexId}`)
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

    it('shoud clear completedAt when todo is note completed', (done) => {
        var hexId = todos[1]._id.toHexString(); // get the id of the item already completed
        var text = 'Updated the completed todo';

        request(app)
            .patch(`/todos/${hexId}`)
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