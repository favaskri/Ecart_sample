var db = require('../cofig/connection')
var collection = require('../cofig/collections')
const bcrypt = require('bcrypt')
const collections = require('../cofig/collections')
var objectId = require('mongodb').ObjectID
const { response } = require('express')
const { RequestHeaderFieldsTooLarge } = require('http-errors')
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTIONS).insertOne(userData).then((data) => {
                resolve(data.ops[0]);

            })

        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTIONS).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log('login success');
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login faile')
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('email id not exist')
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                    {
                        
                            $push: { products:objectId(proId)   }
                        

                    }).then((response) => {
                        resolve()
                    })

            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [objectId(proId)]

                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }

        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                }, {
                    $lookup: {
                        from:collection.PRODUCT_COLLECTIONS,
                        let: { prodList: '$products' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$_id', '$$prodList'

                                        ]
                                    }



                                }
                            }
                        ], as: 'cartItems'

                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            let count =0
            let cart= await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)

        })

    }

    
}
