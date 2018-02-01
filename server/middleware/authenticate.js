var { User } = require('./../models/user');

var authenticate = (req, res, next) => {
    var token = req.header('x-auth');

    User.findByToken(token).then((user) => {
        if (!user) {
            return Promise.reject();
        }
        req.user = user;
        req.token = token;
        next(); // it won't send request back if token isn't correct
    }).catch((e) => {
        res.status(401).send(); // throws HTTP error if token is not valid
    });
};

module.exports = { authenticate };