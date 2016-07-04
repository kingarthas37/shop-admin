'use strict';

var router = require('express').Router();
var AV = require('leanengine');

var flash = require('connect-flash');

var async = require('async');
var extend = require("xtend");

var config = require('../../lib/config');

//class
var OrderTrack = AV.Object.extend('OrderTrack');
var Customer = AV.Object.extend('Customer');

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
    
    var searchOrderName = req.query['search-order-name'];
    var searchCustomerName = req.query['search-customer-name'];
    let searchAddress = req.query['search-address'];
    let searchCustomerId = req.query['search-customer-id'];
    
    data = extend(data,{
        flash: {
            success:req.flash('success'),
            error:req.flash('error')
        },
        user:req.AV.user,
        searchOrderName:searchOrderName,
        searchCustomerName:searchCustomerName,
        searchAddress:searchAddress,
        searchCustomerId:searchCustomerId
    });
    
    
    let query = new AV.Query(OrderTrack);
    
    if(searchOrderName) {
        query.contains('orderName',searchOrderName);
    }

    if(searchCustomerName) {
        let queryName = new AV.Query(OrderTrack);
        queryName.contains('customerName',searchCustomerName);
        let queryTaobaoName = new AV.Query(OrderTrack);
        queryTaobaoName.contains('taobaoName',searchCustomerName);
        query = new AV.Query.or(queryName,queryTaobaoName);
    }
    
    if(searchCustomerId) {
        query.equalTo('customerId',parseInt(searchCustomerId));
    }
    
    if(searchAddress) {
        query.contains('shippingAddress',searchAddress);
    }
    
    query.count().then((count) => {
        
        data = extend(data,{
            orderPager:pager(page,limit,count),
            orderCount:count
        });
        
        query.skip((page - 1) * limit);
        query.limit(limit);

        if(order === 'asc') {
            query.ascending("orderId");
        } else {
            query.descending('orderId');
        }

        if(searchOrderName) {
            query.contains('orderName',searchOrderName);
        }

        if(searchCustomerName) {
            let queryName = new AV.Query(OrderTrack);
            queryName.contains('customerName',searchCustomerName);
            let queryTaobaoName = new AV.Query(OrderTrack);
            queryTaobaoName.contains('taobaoName',searchCustomerName);
            query = new AV.Query.or(queryName,queryTaobaoName);
        }

        if(searchCustomerId) {
            query.equalTo('customerId',parseInt(searchCustomerId));
        }
        
        if(searchAddress) {
            query.contains('shippingAddress',searchAddress);
        }
        
        return query.find();
        
    }).then(results => {
        data = extend(data, {
            order: results
        });
        res.render('order', data);
    });

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


router.get('/get-customer',(req,res) => {
    
    let customerListId = req.query['customerListId'];
    
    customerListId = customerListId.map(item => parseInt(item));

    let query = new AV.Query(Customer);
    query.containedIn('customerId',customerListId);
    query.select('customerId','weixin','taobao');
    query.find().then(customers => {
        res.send({
            success:1,
            customers
        });
    });
    
});

module.exports = router;