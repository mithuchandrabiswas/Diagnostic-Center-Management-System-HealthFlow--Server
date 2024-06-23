const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.VITE_STRIPE_Secret_key);

const port = process.env.PORT || 9000;

// middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'https://assignment-twelve---full-stack.web.app'],
    credentials: true,
};
app.use(cors(corsOptions));
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
            console.log('inside verify token', req.headers);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            console.log(token);
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
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

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
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            console.log(req.headers);
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

        // Update user data
        app.put('/user/update/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const query = { email }
            const updateDoc = {
                $set: { ...user, timestamp: Date.now() },
            }
            const result = await usersCollection.updateOne(query, updateDoc)
            res.send(result)
        });
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
        app.get('/banners/:email', verifyToken, verifyAdmin, async (req, res) => {
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
        // add test info save into db
        app.post('/test', async (req, res) => {
            try {
                const testData = req.body
                const result = await testsCollection.insertOne(testData)
                res.status(201).send(result); // Send response with inserted document
            } catch (error) {
                console.error(error);
                res.status(500).send('Failed to add test'); // Send error message as text
            }
        });

        // get all tests and implement filter and pagination also
        app.get('/tests', verifyToken, async (req, res) => {
            const size = parseInt(req.query.size) || 10; // Default size to 10 if not provided
            const page = parseInt(req.query.page) - 1 || 0; // Default page to 0 if not provided
            const filter = req.query.filter
            // console.log(filter);
            let query = {};
            // Default to today's date if no filter is provided
            const today = new Date(); // Current date object
            today.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0 to get start of the day

            // Filter for dates greater than or equal to today
            query.date = { $gte: today.toLocaleDateString('en-US') }; // Convert today's date to MM/DD/YYYY format

            if (filter) query = { date: filter }
            // console.log('Query:', query);   // Debug log

            try {
                const result = await testsCollection
                    .find(query)
                    .sort({ date: 1 }) // Sort ascending by date, if needed
                    .skip(page * size)
                    .limit(size)
                    .toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching tests:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // get all tests as a number
        app.get('/tests-count', async (req, res) => {
            try {
                const today = new Date(); // Current date object
                today.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0 to get start of the day

                // Filter for dates greater than or equal to today
                const query = { date: { $gte: today.toLocaleDateString('en-US') } };

                const count = await testsCollection.countDocuments(query);
                res.send({ count });
            } catch (error) {
                console.error('Error counting documents:', error);
                res.status(500).send('Internal Server Error');
            }
        });


        // Get a single test data for showing test details from db using id
        app.get('/test-details/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await testsCollection.findOne(query)
            res.send(result)
        })

        // Get data for featured Section
        app.get('/featured-tests', async (req, res) => {
            try {
                const popularTests = await appointmentsCollection.aggregate([
                    { $group: { _id: "$testId", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]).toArray();

                const testIds = popularTests.map(test => new ObjectId(test._id));

                const featuredTests = await testsCollection.find({ _id: { $in: testIds } }).toArray();

                res.send(featuredTests);
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });

        //Update all add test data by specific id
        app.put('/test/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: updateData,
            };
            const result = await testsCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        // Delete test by by specific id
        app.delete('/test/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const result = await testsCollection.deleteOne({ _id: new ObjectId(id) });
                res.send({ message: 'Test deleted successfully', result });
            } catch (error) {
                console.error(error);
                res.status(500).send('Failed to delete test');
            }
        });

        // Get all tests by specific email
        app.get('/tests/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { 'adminInfo.email': email }
            const result = await testsCollection.find(query).toArray()
            // console.log(result);
            res.send(result)
        })

        // ====================> TEST RELATED API -- END


        // ====================> APPOINTMENTS RELATED API -- START
        // Save a appointment data to database
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

        // Get all appointments and implement search 
        app.get('/appointments', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const searchData = req.query.search || '';
                // console.log('Search Data:', searchData);
                let query = { 'bookerInfo.email': { $regex: searchData, $options: 'i' } };
                // console.log('Query:', query);
                const result = await appointmentsCollection.find(query).toArray();
                // console.log('Result:', result);
                res.send(result);
            } catch (error) {
                // console.error('Error fetching appointments:', error);
                res.status(500).send({ error: 'An error occurred while fetching appointments' });
            }
        });

        // Get all appointments and implement search 
        app.get('/appointmentss', async (req, res) => {
            try {
                // console.log('Search Data:', searchData);
                // console.log('Query:', query);
                const result = await appointmentsCollection.find().toArray();
                // console.log('Result:', result);
                res.send(result);
            } catch (error) {
                // console.error('Error fetching appointments:', error);
                res.status(500).send({ error: 'An error occurred while fetching appointments' });
            }
        });


        // Delete a appointment by specific ID
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
        // Update report_status of a appointment by specific ID
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

        // Get all appointments by specific email
        app.get('/appointments/:email', verifyToken, async (req, res) => {
            // console.log(req.headers);
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



        // Create Stripe payment intent
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

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            res.send({ paymentResult });
        })

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
