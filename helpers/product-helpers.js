var db = require('../cofig/connection')
var collection = require('../cofig/collections')
var objectId = require('mongodb').ObjectID
const collections = require('../cofig/collections')
const { response } = require('express')
module.exports = {
    addProduct: (product, callback) => {
        console.log(product)
        db.get().collection('product').insertOne(product).then((data) => {
            console.log(data)
            callback(data.ops[0]._id)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTIONS).find().toArray()
            resolve(products)

        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTIONS).removeOne({ _id: objectId(prodId) }).then((response) => {
                // console.log(response)
                resolve(response)
            })
        })
    },
    getproductDetails: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTIONS).findOne({ _id: objectId(prodId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTIONS).updateOne({ _id: objectId(proId) }, {
                $set    :{
                product_name: proDetails.product_name,
                product_name_fr: proDetails.product_name_fr,
                product_weight: proDetails.product_weight,
                product_price: proDetails.product_price
                }
                
            }).then((response)=>{
                resolve()
            })
        })
    }
}