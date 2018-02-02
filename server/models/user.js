const mongoose = require('mongoose'); // mongodb database connector
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

//defining methods for User model

// defining model data
var UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        minlenght: 1,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid e-mail'
        }
    },
    password: {
        type: String,
        require: true,
        minlenght: 6
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

// Hide user security data from requester
UserSchema.methods.toJSON = function() {
    var user = this;
    var userObject = user.toObject();

    // use lodash to get data from object
    // return only id and email to requester
    return _.pick(userObject, ['_id', 'email']);
};

// including methods
// note: arrow (=>) can't bind function to method
UserSchema.methods.generateAuthToken = function() {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({ _id: user._id.toHexString(), access }, 'abc123').toString();

    // including token data
    user.tokens.push({ access, token });

    // save modified user (now, he has a token!)
    // "return" is required here since it needs to return the token
    return user.save().then(() => {
        // return generated token
        return token;
    });
};

UserSchema.methods.removeToken = function(token) {
    var user = this;

    return user.update({
        $pull: {
            tokens: { token }
        }
    });

};

UserSchema.statics.findByToken = function(token) {
    var User = this;
    var decoded;

    try {
        decoded = jwt.verify(token, 'abc123'); // secret must be moved to a config file
    } catch (e) {
        // token is not correct - backing a promisse to be thrown by caller
        return Promise.reject();
    }


    return User.findOne({
        _id: decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });

};

UserSchema.statics.findByCredentials = function(email, password) {
    var User = this;

    return User.findOne({ email }).then((user) => {
        if (!user) {
            return Promise.reject();
        }

        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user);
                } else {
                    reject();
                }
            });
        });
    });
};

UserSchema.pre('save', function(next) { // called automatically before object saving
    var user = this;

    if (user.isModified('password')) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

var User = mongoose.model('User', UserSchema);

module.exports = { User };