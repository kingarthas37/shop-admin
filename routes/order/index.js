'use strict';

var router = require('express').Router();
var AV = require('leanengine');

var flash = require('connect-flash');

var async = require('async');
var extend = require("xtend");

var config = require('../../lib/config');

//class
var OrderTrack = AV.Object.extend('OrderTrack');

//lib
var pager = require('../../lib/pager');

var data =  extend(config.data,{
    title: '发货订单编辑-首页',
    currentPage: 'order'
});


//首页
router.get('/', function (req, res, next) {

    if (!req.AV.user) {
        return res.redirect('/login?return=' + encodeURIComponent(req.originalUrl));
    }
    
    var page = req.query.page ? parseInt(req.query.page) : 1;
    var limit = req.query.limit ? parseInt(req.query.limit) : config.page.LIMIT;
    var order = req.query.order || 'desc';
    
    var searchOrdername = req.query['search-order-name'];
    var searchCustomerName = req.query['search-customer-name'];

    data = extend(data,{
        flash: {
            success:req.flash('success'),
            error:req.flash('error')
        },
        user:req.AV.user,
        searchOrderName:searchOrdername,
        searchCustomerName:searchCustomerName
    });

    async.series([

        function(cb) {
            
            var query = new AV.Query(OrderTrack);
            
            if(searchOrdername) {
                query.contains('orderName',searchOrdername);
            }
            
            if(searchCustomerName) {
                query.contains('customerName',searchCustomerName);
            }
            
            query.count({
                success: function(count) {
                    data = extend(data,{
                        orderPager:pager(page,limit,count),
                        orderCount:count
                    });
                    cb();
                },
                error: function(error) {
                    next(error);
                }
            });
        },

        function (cb) {

            var query = new AV.Query(OrderTrack);

            query.skip((page - 1) * limit);
            query.limit(limit);
            
            if(order === 'asc') {
                query.ascending("orderId");
            } else {
                query.descending('orderId');
            }

            if(searchOrdername) {
                query.contains('orderName',searchOrdername);
            }

            if(searchCustomerName) {
                query.contains('customerName',searchCustomerName);
            }

            query.find({
                success: function (results) {
                    data = extend(data, {
                        order: results
                    });
                    cb();
                },
                error: function (err) {
                    next(err);
                }
            });

        },

        function () {
            res.render('order', data);
        }

    ]);

});


router.get('/remove/:orderId', function (req, res, next) {

    if(!req.AV.user) {
        return res.redirect('/login?return=' + encodeURIComponent(req.originalUrl));
    }

    var orderId = req.params.orderId;

    async.waterfall([

        function (cb) {
            var query = new AV.Query(OrderTrack);
            query.equalTo('orderId', parseInt(orderId));
            query.first({
                success: function (object) {
                    cb(null, object);
                },
                error: function (err) {
                    next(err);
                }
            });
        },
        function (object, cb) {
            object.destroy({
                success: function () {
                    req.flash('success', '删除成功!');
                    res.redirect('/order');
                }
            });
        }

    ]);
});

module.exports = router;