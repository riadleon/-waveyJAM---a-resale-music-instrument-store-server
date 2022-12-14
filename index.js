const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.afq9fgb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const categoryCollection = client.db('waveyJAM').collection('categories');
        const productCollection = client.db('waveyJAM').collection('products');
        const userCollection = client.db('waveyJAM').collection('users');
        const bookingsCollection = client.db('waveyJAM').collection('productBooking');
        const advertiseCollection = client.db('waveyJAM').collection('advertise');
        const paymentsCollection = client.db('waveyJAM').collection('payment');

        app.get('/categories', async (req, res) => {
            const query = {}
            const cursor = categoryCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories);
        });
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { id: id };
            const product = await productCollection.find(query).toArray();
            res.send(product);
        })



        //users
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ waveyToken: token });
            }
            res.status(403).send({ waveyToken: '' })
        });

        app.put('/users',  async (req, res) => {
            const role = req.params.role
            const user = req.body

            const filter = { role: role }
            const options = { upsert: true }
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options)

            // const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            //     expiresIn: '1d',
            // })
            console.log(result)
            res.send({ result })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        //get all buyer & seller
        app.get('/users', async (req, res) => {
            let query = {};
            if (req.query.role) {
                query = {
                    role: req.query.role
                };
            }
            const cursor = userCollection.find(query);
            const user = await cursor.toArray();
            res.send(user);
        });
        app.get('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const user = await userCollection.findOne(query);
            res.send(user);
        });

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const user = await userCollection.deleteOne(query);
            res.send(user);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'buyer' });
        })




        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        })





        app.post("/products", verifyJWT, async (req, res) => {
            try {
                const result = await productCollection.insertOne(req.body);

                if (result.insertedId) {
                    res.send({
                        success: true,
                        message: `Successfully created the ${req.body.name} with id ${result.insertedId}`,
                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't create the product",
                    });
                }
            } catch (error) {
                console.log(error.name.bgRed, error.message.bold);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        });
        // app.get('/products', async (req, res) => {
        //     const query = {}
        //     const cursor = productCollection.find(query);
        //     const products = await cursor.toArray();
        //     res.send(products);
        // });

        app.get('/products', async (req, res) => {



            let query = {};

            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        //product Booking
        app.get('/productBooking', async (req, res) => {
            // const email = req.query.email;
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' });
            // }

            let query = {};
            const email = req.query.email
            if (email) {
                query = {
                    email: email,
                }
            }
            const productBooking = await bookingsCollection.find(query).toArray();
            res.send(productBooking);
        })
        app.get('/productBooking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const productBooking = await bookingsCollection.findOne(query);
            res.send(productBooking);
        })

        app.post('/productBooking', async (req, res) => {
            const productBooking = req.body;
            console.log(productBooking);
            const query = {

                email: productBooking.email,
                product: productBooking.product
            }



            const result = await bookingsCollection.insertOne(productBooking);
            res.send(result);
        });

        //payment

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        //advertise
        app.post('/advertise', async (req, res) => {
            const user = req.body;
            const result = await advertiseCollection.insertOne(user);
            res.send(result);
            console.log('Data added successfully...');
        });
        app.get('/advertise', async (req, res) => {
            const query = {}
            const cursor = advertiseCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories);
        });



    } finally {

    }
}



run().catch(err => console.error(err));

app.get('/', (req, res) => {
    res.send('WaveyJAM server is running')
})

app.listen(port, () => {
    console.log(`WaveyJAM  server running on ${port}`);
})