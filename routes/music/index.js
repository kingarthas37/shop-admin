'use strict';

var router = require('express').Router();
var AV = require('leanengine');

var flash = require('connect-flash');

var async = require('async');
var extend = require("xtend");
var config = require('../../lib/config');

//class
var Music = AV.Object.extend('Music');

//lib
var pager = require('../../lib/pager');

var data = extend(config.data,{
    title:'音乐编辑-首页',
    currentPage:'music'
});

//首页
router.get('/', function (req, res, next) {

    if(!req.AV.user) {
        return res.redirect('/login');
    }
    
    var page = req.query.page ? parseInt(req.query.page) : 1;
    var limit = req.query.limit ? parseInt(req.query.limit) : 10;
    var order = req.query.order || 'desc';
    
    var search = req.query['music-search'] ? req.query['music-search'].trim() : '';

    data = extend(data,{
        search:search,
        user:req.AV.user,
        flash:{
            success:req.flash('success'),
            error:req.flash('error')
        }
    });

    async.series([

        function(cb) {
            
            var query = new AV.Query(Music);
            
            if(search) {
                query.contains('name',search);
            }
            
            query.count({
                success: function(count) {
                    data = extend(data,{
                        musicPager:pager(page,limit,count)
                    });
                    cb();
                },
                error: function(error) {
                    next(error);
                }
            });
        },

        function (cb) {

            var query = new AV.Query(Music);

            query.skip((page - 1) * limit);
            query.limit(limit);
            
            if(order === 'asc') {
                query.ascending("musicId");
            } else {
                query.descending('musicId');
            }

            if(search) {
                query.contains('name',search);
            }

            query.find({
                success: function (results) {
                    data = extend(data, {
                        music: results
                    });
                    cb();
                },
                error: function (err) {
                    next(err);
                }
            });

        },

        function () {
            res.render('music', data);
        }

    ]);

});

 

module.exports = router;