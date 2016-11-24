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
let Product = AV.Object.extend('Product');
let ProductProperty = AV.Object.extend('ProductProperty');

//lib
var pager = require('../../lib/component/pager-str');

var data = extend(config.data, {
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
    let skip = (page - 1) * limit;
    var order = req.query.order || 'desc';

    var searchOrderName = req.query['search-order-name'];
    var searchCustomerName = req.query['search-customer-name'];
    let searchAddress = req.query['search-address'];
    let searchNotShipped = req.query['search-notshipped'];

    data = extend(data, {
        flash: {
            success: req.flash('success'),
            error: req.flash('error')
        },
        user: req.AV.user,
        searchOrderName,
        searchCustomerName,
        searchAddress,
        searchNotShipped
    });


    async.series([

        function (cb) {

            let cqlWhere = '';

            if (searchOrderName) {
                cqlWhere = `where name like '%${searchOrderName}%'`;
            } else if (searchCustomerName) {
                cqlWhere = `where customerName like '%${searchCustomerName}%' or taobaoName like '%${searchCustomerName}%'`;
            } else if (searchAddress) {
                cqlWhere = `where shippingAddress like '%${searchAddress}%'`;
            } else if (searchNotShipped) {
                cqlWhere = `where shippingStatus = 'notshipped'`;
            }

            let cql = `select count(*) from OrderTrack ${cqlWhere}`;

            AV.Query.doCloudQuery(cql).then(function (results) {
                data = extend(data, {
                    orderPager: pager(page, limit, results.count),
                    orderCount: results.count
                });
                cb();
            });

        },

        function () {

            let cqlWhere = '';

            if (searchOrderName) {
                cqlWhere = `where name like '%${searchOrderName}%'`;
            } else if (searchCustomerName) {
                cqlWhere = `where customerName like '%${searchCustomerName}%' or taobaoName like '%${searchCustomerName}%'`;
            } else if (searchAddress) {
                cqlWhere = `where shippingAddress like '%${searchAddress}%'`;
            } else if (searchNotShipped) {
                cqlWhere = `where shippingStatus = 'notshipped'`;
            }

            let cql = `select * from OrderTrack ${cqlWhere} limit ${skip},${limit} order by orderId ${order}`;

            AV.Query.doCloudQuery(cql).then(function (results) {
                data = extend(data, {
                    order: results.results
                });
                res.render('order', data);
            });

        }

    ]);

});


router.get('/remove/:orderId', function (req, res, next) {

    if (!req.AV.user) {
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


//ajax返回用户信,淘宝名
router.get('/get-customer', (req, res) => {

    let queryData = req.query['queryData'];
    
    if(!queryData) {
        return res.send({});
    }
    
    let customerListId = queryData.customerId;
    let orderListId = queryData.orderId;

    customerListId = customerListId.map(item => parseInt(item));
    orderListId = orderListId.map(item => parseInt(item));

    
    async.parallel([
        function(cb) {
            let query = new AV.Query(Customer);
            query.containedIn('customerId', customerListId);
            query.select('customerId', 'weixin', 'taobao');
            query.find().then(customers => {
                data.customers = customers;
                cb();
            });
        },
        function(cb) {
            let query = new AV.Query(OrderTrack);
            query.containedIn('customerId', customerListId);
            query.notContainedIn('orderId',orderListId);
            query.equalTo('shippingCompany','shunfeng');
            query.select('customerId','shippingCompany');
            query.find().then(shippings => {
                data.shippings = shippings;
                cb();
            });
        }
    ], function (err, results) {
        data.success = 1;
        res.send(data);
    });

});

//ajax返回产品图片
router.get('/get-image', (req, res)=> {

    let productId = req.query['productId'];
    if (productId) {
        productId = productId.map(item => parseInt(item));
    }
    let query = new AV.Query(Product);
    query.containedIn('productId', productId);
    query.select('productId', 'mainImage');
    query.find().then(images => {

        let data = {};
        images.forEach((image, i) => {

            let imgArr = [];
            for (let i in image.get('mainImage')) {
                imgArr.push(image.get('mainImage')[i]);
            }
            data[image.get('productId')] = imgArr[0].url;
        });

        res.send({
            success: 1,
            images: data
        });
    });

});


//ajax设置库存状态
router.get('/update-stock', (req, res)=> {

    let orderId = parseInt(req.query['order-id']);
    let productId = req.query['product-id'];
    let isSet = req.query['is-set'] === 'true' ? true : false;

    let query = new AV.Query(OrderTrack);
    query.equalTo('orderId', orderId);
    query.select('isShipping', 'productId');
    query.first().then(result => {

        let isShippingCell = result.get('isShipping');
        let productIdCell = result.get('productId');
        for (let i = 0; i < isShippingCell.length; i++) {
            if (productIdCell[i] === productId) {
                isShippingCell[i] = !isSet;
            }
        }

        result.set('isShipping', isShippingCell);
        return result.save();

    }).then(result => {
        res.json({success: 1});
    });

});

//ajax设置库存
router.get('/set-stock', (req, res)=> {
    let productId = parseInt(req.query['product-id']);
    let query = new AV.Query(ProductProperty);
    query.equalTo('productId', productId);
    query.select('stock', 'sales');
    query.first().then(result=> {
        res.json({
            success: 1,
            stock: result.get('stock'),
            sales: result.get('sales'),
            productId: productId
        });
    });
});

router.post('/set-stock', (req, res)=> {
    let productId = parseInt(req.body['product-id']);
    let stock = parseInt(req.body['stock']);
    let sales = parseInt(req.body['sales']);

    let query = new AV.Query(ProductProperty);
    query.equalTo('productId', productId);
    query.first().then(result=> {
        return result.save({
            stock,
            sales
        });

    }).then(result => {
        res.json({
            success: 1
        });
    });
});

router.post('/shipping', (req, res) => {

    let orderId = parseInt(req.body['order-id']);
    let shippingStatus = req.body['shipping'] === 'true' ? 'shipped' : 'notshipped';
    let query = new AV.Query(OrderTrack);
    query.equalTo('orderId', orderId);
    query.first().then(result => {

        result.set('shippingStatus', shippingStatus);
        return result.save();

    }).then(()=> {

        res.send({
            success: 1
        });

    });

});

/* insert demo 
 router.get('/insert',(req,res)=> {
 let OrderTrack = AV.Object.extend('OrderTrack');
 let query = new AV.Query(OrderTrack);
 query.descending('orderId');
 query.limit(200);
 query.find(function(results){
 let count = 0;
 async.forEachSeries(results,function(item,callback) {
 count ++;
 item.addUnique('name', item.get('orderName'));
 item.save().then(function() {
 console.info(item.get('orderName') + ' insert ok' + ' ' + count);
 callback();
 });

 }, function(err) {
 res.send({
 success:'ok'
 });
 });
 });
 });
 */

//typeahead查询产品名称,用于order add/edit页面
router.get('/product', (req, res) => {

    let name = req.query['name'];
    let query = new AV.Query(Product);
    query.contains('name', name);
    query.select('name', 'productId', 'mainImage');

    query.find().then(results => {

        let jsonData = [];

        for (let i = 0; i < results.length; i++) {
            let imageArr = [];
            for (let key in results[i].get('mainImage')) {
                imageArr.push(results[i].get('mainImage')[key].url);
            }
            let obj = {
                'value': `${results[i].get('name')} {id:${results[i].get('productId')}}`,
                'productId': results[i].get('productId'),
                'image': imageArr[0] || 'http://ac-JoaBcRTt.clouddn.com/b7f0d580ef9a4ae8e19b.png'
            };
            jsonData.push(obj);
        }
        return res.json(jsonData);

    }, ()=> res.json({success: 0}));

});

module.exports = router;