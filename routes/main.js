'use strict';

var router = require('express').Router();

module.exports = {
    //product
    '/product':require('./product/index'),
    '/product/add':require('./product/add'),
    '/product/edit':require('./product/edit'),
    '/product/remove':require('./product/remove'),
    '/product/preview':require('./product/preview'),
    
    //music
    '/music':require('./music/index'),
    '/music/add':require('./music/add'),
    '/music/edit':require('./music/edit'),
    '/music/remove':require('./music/remove'),
    '/music/preview':require('./music/preview')
};