const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.VITE_STRIPE_Secret_key);

const port = process.env.PORT || 9000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2bu9h7l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
})

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        //Create Database Collection
        const db = client.db('diagnosticCenterManagementSystemDB')
        const usersCollection = db.collection('users')
        const bannersCollection = db.collection('banners')
        const testsCollection = db.collection('tests')
        const appointmentsCollection = db.collection('appointments')
        const paymentCollection = db.collection("payments");

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middlewares 
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        // users related api
        // app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
        //     const result = await userCollection.find().toArray();
        //     res.send(result);
        // });

        // app.get('/users/admin/:email', verifyToken, async (req, res) => {
        //     const email = req.params.email;

        //     if (email !== req.decoded.email) {
        //         return res.status(403).send({ message: 'forbidden access' })
        //     }

        //     const query = { email: email };
        //     const user = await userCollection.findOne(query);
        //     let admin = false;
        //     if (user) {
        //         admin = user?.role === 'admin';
        //     }
        //     res.send({ admin });
        // })


        // Get All Districts data from database
        app.get('/districts', async (req, res) => {
            const result = await db.collection('districts').find().toArray()
            // console.log(result);
            res.send(result)
        })

        // Get all upazilas Data from database
        app.get('/upazilas', async (req, res) => {
            const result = await db.collection('upazilas').find().toArray()
            // console.log(result);
            res.send(result)
        })

        // Get all recommendations Data from database
        app.get('/recommendations', async (req, res) => {
            const result = await db.collection('recommendationsData').find().toArray()
            // console.log(result);
            res.send(result)
        })




        // ====================> USER RELATED API -- START

        // Save user data to mongodb database
        app.post('/user', async (req, res) => {
            const user = req.body;
            // insert email if user doesnt exists: 
            // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User with this email already exists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // Get user to database by specific email for get user role
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            try {
                const result = await usersCollection.findOne({ email: email });
                if (!result) {
                    return res.status(404).send({ message: 'User not found' });
                }
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // get all users data from db
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        //update a user role and status
        app.patch('/users/update/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const query = { email }
            const updateDoc = {
                $set: { ...user, timestamp: Date.now() },
            }
            const result = await usersCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        // app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) }
        //     const result = await userCollection.deleteOne(query);
        //     res.send(result);
        // })

        // ====================> USER RELATED API -- END


        // ====================> BANNER RELATED API -- START

        // Save banner data to database
        app.post('/banner', async (req, res) => {
            const bannerData = req.body
            const result = await bannersCollection.insertOne(bannerData)
        })

        app.get('/banners', async (req, res) => {
            const result = await bannersCollection.find().toArray()
            res.send(result)
        })

        app.get('/banners/:email', async (req, res) => {
            const email = req.params.email
            const query = { 'adminInfo.email': email }
            const result = await bannersCollection.find(query).toArray()
            console.log(result);
            res.send(result)
        })

        //update a banner isActive Status
        // app.patch('/banners/update/:id', async (req, res) => {
        //     const id = req.params.id
        //     const banner = req.body
        //     const alreadyActive = banner.isActive === 'true'
        //     if (alreadyActive) {
        //         return { message: 'already a banner is active' }
        //     } else {
        //         const query = { _id: new ObjectId(id) }
        //         const updateDoc = {
        //             $set: { ...banner, timestamp: Date.now() },
        //         }
        //         const result = await bannersCollection.updateOne(query, updateDoc)
        //     }
        //     res.send(result)
        // })

        // app.patch('/banners/update/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const banner = req.body;

        //     if (!ObjectId.isValid(id)) {
        //         return res.status(400).json({ message: 'Invalid banner ID' });
        //     }

        //     if (typeof banner.isActive !== 'string') {
        //         return res.status(400).json({ message: 'Invalid value for isActive' });
        //     }

        //     const isActive = banner.isActive === 'true';

        //     try {
        //         const query = { _id: new ObjectId(id) };

        //         if (isActive) {
        //             await bannersCollection.updateMany(
        //                 { isActive: true },
        //                 { $set: { isActive: false } }
        //             );
        //         }

        //         const updateDoc = {
        //             $set: { ...banner, timestamp: Date.now() },
        //         };
        //         const result = await bannersCollection.updateOne(query, updateDoc);

        //         if (result.matchedCount === 0) {
        //             return res.status(404).json({ message: 'Banner not found' });
        //         }

        //         res.json({ message: 'Banner updated successfully', result });
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).json({ message: 'An error occurred while updating the banner' });
        //     }
        // });

        app.patch('/banners/update/:id', async (req, res) => {
            const id = req.params.id;
            const banner = req.body;
            try {
                const query = { _id: new ObjectId(id) };
                if (banner.isActive) {
                    // Set all other banners to inactive
                    await bannersCollection.updateMany(
                        { _id: { $ne: new ObjectId(id) } },
                        { $set: { isActive: false } }
                    );
                }
                const updateDoc = {
                    $set: { ...banner, timestamp: Date.now() },
                };
                const result = await bannersCollection.updateOne(query, updateDoc);

                res.json({ message: 'Banner updated successfully', result });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'An error occurred while updating the banner' });
            }
        });





        // ====================> BANNER RELATED API -- END



        // ====================> TEST RELATED API -- START

        // Save add test data to database
        app.post('/test', async (req, res) => {
            const testData = req.body
            const result = await testsCollection.insertOne(testData)
            console.log(result);
        })

        // get all tests
        app.get('/tests', async (req, res) => {
            const result = await testsCollection.find().toArray()
            // console.log(result);
            res.send(result)
        })

        // Get a single room data from db using _id
        app.get('/test-details/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await testsCollection.findOne(query)
            res.send(result)
        })

        app.get('/tests/:email', async (req, res) => {
            const email = req.params.email
            const query = { 'adminInfo.email': email }
            const result = await testsCollection.find(query).toArray()
            // console.log(result);
            res.send(result)
        })

        // ====================> TEST RELATED API -- END


        // ====================> APPOINTMENTS RELATED API -- START
         // Save add test data to database
         app.post('/appointment', async (req, res) => {
            const appointmentData = req.body
            const result = await appointmentsCollection.insertOne(appointmentData)
            console.log(result);
        })
        app.get('/appointments/:email', async (req, res) => {
            const email = req.params.email
            const query = { 'bookerInfo.email': email }
            const result = await appointmentsCollection.find(query).toArray()
            // console.log(result);
            res.send(result)
        })





 


        // ====================> APPOINTMENTS RELATED API -- END




        // menu related apis
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await menuCollection.insertOne(item);
            res.send(result);
        });

        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        });

        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.findOne(query);
            res.send(result);
        })


        app.patch('/menu/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }

            const result = await menuCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        // carts collection
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem);
            res.send(result);
        });

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        });

        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });


        // app.get('/payments/:email', verifyToken, async (req, res) => {
        //     const query = { email: req.params.email }
        //     if (req.params.email !== req.decoded.email) {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }
        //     const result = await paymentCollection.find(query).toArray();
        //     res.send(result);
        // })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            res.send({ paymentResult });
        })

        // stats or analytics
        // app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
        //     const users = await userCollection.estimatedDocumentCount();
        //     const menuItems = await menuCollection.estimatedDocumentCount();
        //     const orders = await paymentCollection.estimatedDocumentCount();

        //     // this is not the best way
        //     // const payments = await paymentCollection.find().toArray();
        //     // const revenue = payments.reduce((total, payment) => total + payment.price, 0);

        //     const result = await paymentCollection.aggregate([
        //         {
        //             $group: {
        //                 _id: null,
        //                 totalRevenue: {
        //                     $sum: '$price'
        //                 }
        //             }
        //         }
        //     ]).toArray();

        //     const revenue = result.length > 0 ? result[0].totalRevenue : 0;

        //     res.send({
        //         users,
        //         menuItems,
        //         orders,
        //         revenue
        //     })
        // })


        // order status
        /**
         * ----------------------------
         *    NON-Efficient Way
         * ------------------------------
         * 1. load all the payments
         * 2. for every menuItemIds (which is an array), go find the item from menu collection
         * 3. for every item in the menu collection that you found from a payment entry (document)
        */

        // using aggregate pipeline
        // app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
        //     const result = await paymentCollection.aggregate([
        //         {
        //             $unwind: '$menuItemIds'
        //         },
        //         {
        //             $lookup: {
        //                 from: 'menu',
        //                 localField: 'menuItemIds',
        //                 foreignField: '_id',
        //                 as: 'menuItems'
        //             }
        //         },
        //         {
        //             $unwind: '$menuItems'
        //         },
        //         {
        //             $group: {
        //                 _id: '$menuItems.category',
        //                 quantity: { $sum: 1 },
        //                 revenue: { $sum: '$menuItems.price' }
        //             }
        //         },
        //         {
        //             $project: {
        //                 _id: 0,
        //                 category: '$_id',
        //                 quantity: '$quantity',
        //                 revenue: '$revenue'
        //             }
        //         }
        //     ]).toArray();

        //     res.send(result);

        // })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('boss is sitting')
})

app.listen(port, () => {
    console.log(`DCMS is sitting on port ${port}`);
})

/**
 * --------------------------------
 *      NAMING CONVENTION
 * --------------------------------
 * app.get('/users')
 * app.get('/users/:id')
 * app.post('/users')
 * app.put('/users/:id')
 * app.patch('/users/:id')
 * app.delete('/users/:id')
 * 
*/