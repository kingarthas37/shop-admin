'use strict';

var router = require('express').Router();
var AV = require('leanengine');

var config = require('../../lib/config');
var utils = require('../../lib/utils');

var flash = require('connect-flash');

var async = require('async');
var extend = require("xtend");

//class
var Earning = AV.Object.extend('Earning');
var PurchaseTrack = AV.Object.extend('PurchaseTrack');

var data =  extend(config.data,{
    title:'编辑采购记账统计',
    currentPage:'spent'
});


router.get('/', function (req, res, next) {

    if(!req.currentUser) {
        return res.redirect('/?return=' + encodeURIComponent(req.originalUrl));
    }

    var date = new Date(req.query.date + ' 00:00:00');
    var lastday = req.query['lastday'] ? true : false;
    
    data = extend(data,{
        flash: {
            success:req.flash('success'),
            error:req.flash('error')
        },
        user:req.currentUser
    });

    var query = new AV.Query(Earning);
    
    queryFun();
    
    function queryFun() {
        query.equalTo('date',date);
        query.first({}).then(function(result) {
            if(result) {
                
                data = extend(data,{
                    lastday:lastday,
                    earning:result
                });
                return res.render('spent/edit',data);
                
            } else {

                var earning = new Earning();
                earning.set('date',date);
                earning.save().then(function() {
                    return queryFun();     
                });
            }
        });
    }
    
});


router.post('/', function (req, res, next) {

    if(!req.currentUser) {
        return res.redirect('/?return=' + encodeURIComponent(req.originalUrl));
    }

    var spentUser1 = Number(req.body['spent-user1']);
    var spentUser2 = Number(req.body['spent-user2']);
    var spentUser3 = Number(req.body['spent-user3']);
    var spentUser4 = Number(req.body['spent-user4']);
    var spentUser1Comment = req.body['spent-user1-comment'];
    var spentUser2Comment = req.body['spent-user2-comment'];
    var spentUser3Comment = req.body['spent-user3-comment'];
    var spentUser4Comment = req.body['spent-user4-comment'];

    var earningId = parseInt(req.body['earning-id']);

    data = extend(data,{
        flash: {
            success:req.flash('success'),
            error:req.flash('error')
        }
    });

    var query = new AV.Query(Earning);
    query.equalTo('earningId',earningId);
    console.log(spentUser1,spentUser2,spentUser1Comment,spentUser2Comment);
    query.first().then(function(earning) {
        earning.set('spentUser1',spentUser1);
        earning.set('spentUser2',spentUser2);
        earning.set('spentUser3',spentUser3);
        earning.set('spentUser4',spentUser4);
        earning.set('spentUser1Comment',spentUser1Comment);
        earning.set('spentUser2Comment',spentUser2Comment);
        earning.set('spentUser3Comment',spentUser3Comment);
        earning.set('spentUser4Comment',spentUser4Comment);

        return earning.save();
        
    }).then(function(result) {

        data = extend(data, {
            earning: result
        });

        req.flash('success', '编辑编购记账统计成功!');
        res.redirect('/spent');
    
    });
    
});

module.exports = router;