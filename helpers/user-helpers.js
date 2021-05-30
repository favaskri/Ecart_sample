var db = require('../cofig/connection')
var collection = require('../cofig/collections')
const bcrypt = require('bcrypt')
const collections = require('../cofig/collections')
var objectId = require('mongodb').ObjectID
const Razorpay = require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_qOMpLnoYz4yM14',
    key_secret: 'a1lqu9SAA4Kg4ulg0pQ6kW01',
});
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

        let proObj = {
            item: objectId(proId),
            quantity: 1

        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExit = userCart.products.findIndex(product => product.item == proId)
                console.log(proExit);
                if (proExit !== -1) {
                    db.get().collection(collection.CART_COLLECTION).update({ user: objectId(userId), 'products.item': objectId(proId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => { resolve() })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {

                            $push: { products: proObj }


                        }).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]

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
                },
                {
                    $unwind: '$products'

                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }

                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                }

            ]).toArray()
            // console.log(cartItems[0].products)
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)

        })

    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        console.log("cartId,proId")
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({
                    _id: objectId(details.cart),
                    'products.item': objectId(details.product)
                },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }).then((response) => resolve({ status: true }))
            }

        })

    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'

                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }

                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.product_price'] } }
                    }

                }

            ]).toArray()


            resolve(total[0].total)
        })

    },
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total)
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).removeOne({ user: objectId(order.userId) })
                resolve(response.ops[0]._id)
            })

        })

    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId)
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()
            console.log(orders)
            resolve(orders)

        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            console.log(orderId)
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'

                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }

                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }

                    }
                }


            ]).toArray()

            console.log(orderItems)
            resolve(orderItems)






        })
    },
    generateRazorpay: (orderId, totalPrice) => {
        console.log(orderId, totalPrice)

        return new Promise(async (resolve, reject) => {

            var options = {
                amount: totalPrice,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err)
                } else {
                    console.log("new Order", order);
                    resolve(order)
                }
                });
            

        })

    }

}
