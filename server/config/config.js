/* Configuration script for environment
 */

var env = process.env.NODE_ENV || 'development';

if (env === 'development') {
    // define the same nodejs port as Heroku
    process.env.PORT = 3000;
    // define MONGODB database for development
    process.env.MONGODB_URI = 'mongodb://localhost:27017/TodoApp';
} else if (env === 'test') {
    process.env.PORT = 3000;
    process.env.MONGODB_URI = 'mongodb://localhost:27017/TodoAppTest';
}