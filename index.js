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

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const result = await usersCollection.findOne(query)
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

        //update a user role and status
        // Update user endpoint
        app.patch('/user/update/:email', async (req, res) => {
            const { email } = req.params;
            const { name, image_url, blood_group, district, upazila } = req.body;

            try {
                const updatedUser = await User.findOneAndUpdate(
                    { email },
                    {
                        $set: {
                            name,
                            image_url,
                            blood_group,
                            district,
                            upazila,
                            updatedAt: new Date(),
                        },
                    },
                    { new: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ message: 'User not found' });
                }

                res.status(200).json(updatedUser);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });



        // app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) }
        //     const result = await userCollection.deleteOne(query);
        //     res.send(result);
        // })

        // ====================> USER RELATED API -- END


        // ====================> BANNER RELATED API -- START

        // Add a new banner
        app.post('/banner', async (req, res) => {
            try {
                const bannerData = req.body;
                const result = await bannersCollection.insertOne(bannerData);
                res.status(201).send(result); // Send response with inserted document
            } catch (error) {
                console.error(error);
                res.status(500).send('Failed to add banner'); // Send error message as text
            }
        });

        // Get all banners
        app.get('/banners', async (req, res) => {
            try {
                const result = await bannersCollection.find().toArray();
                res.send(result); // Send response with array of banners
            } catch (error) {
                console.error(error);
                res.status(500).send('Failed to fetch banners'); // Send error message as text
            }
        });

        // Get banners by admin email
        app.get('/banners/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { 'adminInfo.email': email };
                const result = await bannersCollection.find(query).toArray();
                res.send(result); // Send response with array of banners
            } catch (error) {
                console.error(error);
                res.status(500).send('Failed to fetch banners by email'); // Send error message as text
            }
        });

        // Update banner by ID
        app.patch('/banners/update/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const banner = req.body;
                const query = { _id: new ObjectId(id) };

                if (banner.isActive) {
                    // Set all other banners to inactive except the current one
                    await bannersCollection.updateMany(
                        { _id: { $ne: new ObjectId(id) } },
                        { $set: { isActive: false } }
                    );
                }

                const updateDoc = {
                    $set: { ...banner, timestamp: Date.now() },
                };

                const result = await bannersCollection.updateOne(query, updateDoc);
                res.send({ message: 'Banner updated successfully', result }); // Send response with update result
            } catch (error) {
                console.error(error);
                res.status(500).send('Failed to update banner'); // Send error message as text
            }
        });

        // Delete banner by ID
        app.delete('/banner/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await bannersCollection.deleteOne({ _id: new ObjectId(id) });
                res.send({ message: 'Banner deleted successfully', result });
            } catch (error) {
                console.error(error);
                res.status(500).send('Failed to delete banner');
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

        // app.get('/tests', async (req, res) => {
        //     const { page = 1, date } = req.query;
        //     const pageSize = 10; // Number of tests per page
        //     const currentDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format

        //     // Construct the query filter
        //     const dateFilter = date ? new Date(date) : new Date(currentDate);
        //     const filter = { date: { $gte: dateFilter } };

        //     try {
        //         const result = await testsCollection.find(filter)
        //             .skip((page - 1) * pageSize)
        //             .limit(pageSize)
        //             .toArray();

        //         const totalTests = await testsCollection.countDocuments(filter);
        //         const totalPages = Math.ceil(totalTests / pageSize);

        //         res.send({
        //             tests: result,
        //             totalPages,
        //             currentPage: page,
        //         });
        //     } catch (error) {
        //         console.error("Error fetching tests:", error);
        //         res.status(500).send("Internal Server Error");
        //     }
        // });

        // Get a single room data from db using _id
        app.get('/test-details/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await testsCollection.findOne(query)
            res.send(result)
        })

        app.put('/test/:id', async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: updateData,
            };
            const result = await testsCollection.updateOne(query, updateDoc);
            res.send(result);
        });

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
            const appointmentData = req.body;
            const { testId } = appointmentData;
            const session = client.startSession();
            let transactionCommitted = false;

            try {
                session.startTransaction();

                // Insert the new appointment
                const result = await appointmentsCollection.insertOne(appointmentData, { session });

                // Ensure appointment was inserted
                if (!result.insertedId) {
                    throw new Error('Failed to insert appointment');
                }

                // Decrement total_slots in testsCollection
                const query = { _id: new ObjectId(testId) };
                const update = { $inc: { total_slots: -1 } };
                const updateResult = await testsCollection.updateOne(query, update, { session });

                if (updateResult.modifiedCount === 0) {
                    throw new Error('Failed to update test slots');
                }

                await session.commitTransaction();
                transactionCommitted = true;

                // Return the inserted appointment document
                const insertedAppointment = await appointmentsCollection.findOne({ _id: result.insertedId }, { session });
                res.send(insertedAppointment);
            } catch (error) {
                if (!transactionCommitted) {
                    await session.abortTransaction();
                }
                console.error('Error booking appointment:', error);
                res.status(500).send({ message: 'Failed to book appointment and update test slots', error: error.message });
            } finally {
                session.endSession();
            }
        });

        // get all tests
        app.get('/appointments', async (req, res) => {
            const result = await appointmentsCollection.find().toArray()
            // console.log(result);
            res.send(result)
        })

        app.delete('/appointment/:id', async (req, res) => {
            const id = req.params.id;
            const session = client.startSession();
            let transactionCommitted = false;

            try {
                session.startTransaction();

                // Retrieve the appointment to get the testId
                const appointment = await appointmentsCollection.findOne({ _id: new ObjectId(id) }, { session });
                if (!appointment) {
                    throw new Error('Appointment not found');
                }

                const testId = appointment.testId;

                // Delete the appointment
                const result = await appointmentsCollection.deleteOne({ _id: new ObjectId(id) }, { session });
                if (result.deletedCount === 0) {
                    throw new Error('Failed to delete appointment');
                }

                // Increment total_slots in testsCollection
                const incQuery = { _id: new ObjectId(testId) };
                const update = { $inc: { total_slots: 1 } };
                const updateResult = await testsCollection.updateOne(incQuery, update, { session });
                if (updateResult.modifiedCount === 0) {
                    throw new Error('Failed to update test slots');
                }

                await session.commitTransaction();
                transactionCommitted = true;

                res.send({ message: 'Appointment deleted and test slots updated successfully' });
            } catch (error) {
                if (!transactionCommitted) {
                    await session.abortTransaction();
                }
                console.error('Error deleting appointment:', error);
                res.status(500).send({ message: 'Failed to delete appointment and update test slots', error: error.message });
            } finally {
                session.endSession();
            }
        });

        app.put('/appointment/:id', async (req, res) => {
            console.log('Received PUT request to update report_status');
            const id = req.params.id;
            const updateData = req.body;
            console.log(`Updating appointment ID: ${id} with data:`, updateData);
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: updateData,
            };
            try {
                const result = await appointmentsCollection.updateOne(query, updateDoc);
                console.log('Update result:', result);
                if (result.modifiedCount === 1) {
                    res.status(200).send({ message: 'Appointment updated successfully' });
                } else {
                    res.status(404).send({ message: 'Appointment not found or already updated' });
                }
            } catch (error) {
                console.error('Error updating appointment:', error);
                res.status(500).send({ message: 'Error updating appointment', error });
            }
        });

        app.get('/tests/:email', async (req, res) => {
            const email = req.params.email
            const query = { 'adminInfo.email': email }
            const result = await testsCollection.find(query).toArray()
            // console.log(result);
            res.send(result)
        })


        // app.get('/appointments/:email', async (req, res) => {
        //     const email = req.params.email
        //     const query = { 'bookerInfo.email': email }
        //     const result = await appointmentsCollection.find(query).toArray()
        //     // console.log(result);
        //     res.send(result)
        // })
        app.get('/appointments/:email', async (req, res) => {
            const email = req.params.email;
            const query = { 'bookerInfo.email': email };

            try {
                const result = await appointmentsCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching appointments:', error);
                res.status(500).send({ message: 'Failed to fetch appointments', error: error.message });
            }
        });



        // ====================> APPOINTMENTS RELATED API -- END

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