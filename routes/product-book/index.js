'use strict';

var router = require('express').Router();
var AV = require('leanengine');

var flash = require('connect-flash');

var async = require('async');
var extend = require("xtend");

var config = require('../../lib/config');

//class
var ProductBook = AV.Object.extend('ProductBook');
var Customer = AV.Object.extend('Customer');

//lib
var pager = require('../../lib/component/pager-str');

var data =  extend(config.data,{
    title: '客户预定-首页',
    currentPage: 'product-book'
});


//首页
router.get('/', function (req, res, next) {

    if (!req.currentUser) {
        return res.redirect('/?return=' + encodeURIComponent(req.originalUrl));
    }
    
    var page = req.query.page ? parseInt(req.query.page) : 1;
    var limit = req.query.limit ? parseInt(req.query.limit) : config.page.LIMIT;
    let skip = (page - 1) * limit;
    var order = req.query.order || 'desc';
    
    var searchProduct = req.query['search-product'];
    var searchName = req.query['search-name'];
    let searchState = req.query['search-state'];
    let searchCustomer = req.query['search-customer'];

    data = extend(data,{
        flash: {
            success:req.flash('success'),
            error:req.flash('error')
        },
        user:req.currentUser,
        searchProduct,
        searchName,
        searchState,
        searchCustomer
    });

    async.series([
        
        function(cb) {

            let cqlWhere = '';
            
            if(!searchState) {
                cqlWhere = `where productState = ''`;
            }
            
            if(searchCustomer) {
                cqlWhere = `where customerId = ${searchCustomer}`;
            }

            if(searchProduct) {
                cqlWhere = `where productName like '%${searchProduct}%'`;
            } else if(searchName) {
                cqlWhere = `where customerName like '%${searchName}%'`;
            }
            
            let cql = `select count(*) from ProductBook ${cqlWhere}`;
            
            AV.Query.doCloudQuery(cql).then(function (results) {
                data = extend(data,{
                    productBookPager:pager(page,limit,results.count),
                    productBookCount:results.count
                });
                cb();
            });
            
        },
        
        function() {
            
            let cqlWhere = '';

            if(!searchState) {
                cqlWhere = `where productState = ''`;
            }

            if(searchCustomer) {
                cqlWhere = `where customerId = ${searchCustomer}`;
            }
            
            if(searchProduct) {
                cqlWhere = `where productName like '%${searchProduct}%'`;
            } else if(searchName) {
                cqlWhere = `where customerName like '%${searchName}%'`;
            }
            
            let cql = `select * from ProductBook ${cqlWhere} limit ${skip},${limit} order by productBookId ${order}`;
            AV.Query.doCloudQuery(cql).then(function (results) {
                data = extend(data, {
                    productBook: results.results
                });

                let states = [];
                results.results.forEach((result,i)=> {
                    states[i] = 'off';
                    result.get('productState').forEach((n,j)=> {
                        if(!n) {
                            states[i] = '';
                        }
                    });
                });
                data = extend(data,{states});
                
                res.render('product-book', data);
            });
            
        }
        
    ]);

    

  
    

});


router.get('/remove/:id', function (req, res, next) {

    if(!req.currentUser) {
        return res.redirect('/?return=' + encodeURIComponent(req.originalUrl));
    }

    var id = req.params.id;

    async.waterfall([

        function (cb) {
            var query = new AV.Query(ProductBook);
            query.equalTo('productBookId', parseInt(id));
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
                    res.redirect('/product-book');
                }
            });
        }

    ]);
});




router.get('/get-customer-name',(req,res)=> {

    if(!req.currentUser) {
        return res.json({
            error:1,
            msg:config.error.NOT_SUCCESS
        });
    }

    let name = req.query.name;

    let queryName = new AV.Query(Customer);
    queryName.startsWith('name',name);
    
    let queryTaobao = new AV.Query(Customer);
    queryTaobao.startsWith('taobao',name);
    
    let queryWeixin = new AV.Query(Customer);
    queryWeixin.startsWith('weixin',name);
    
    let query = AV.Query.or(queryName,queryTaobao,queryWeixin);
    
    let jsonData = [];

    query.find().then((results) => {
        
        for(let i=0;i<results.length;i++) {
            let obj = {
                "value":results[i].get('name'),
                "customerName":results[i].get('customerName'),
                "customerId":results[i].get('customerId'),
                "taobao":results[i].get('taobao') || '',
                "weixin":results[i].get('weixin') || '',
                "address":results[i].get('address')[0] || ''
            };
            jsonData.push(obj);
        }
        return res.json(jsonData);
    });
    
});

router.post('/set-product-state', function (req, res, next) {

    if(!req.currentUser) {
        return res.redirect('/?return=' + encodeURIComponent(req.originalUrl));
    }
    let productBookId = parseInt(req.body['product-book-id']);
    let productState = JSON.parse(req.body['product-state']);
    
    var query = new AV.Query(ProductBook);

    query.equalTo('productBookId',productBookId);
    query.first().then(function(result) {
        return result.save({
            productState
        });
    }).then(function() {
        res.send({
            success:1
        });
    });

});

module.exports = router;