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

const uri = "mongodb://localhost:27017";
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

        app.get('/categories', async (req, res) => {
            const query = {}
            const cursor = categoryCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories);
        });
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.category_id;
            const query = { _id: id };
            const product = await productCollection.findOne(query);
            res.send(product);
        })



        //users
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userCollection.insertOne(user);
            res.send(result);
        });
        app.post("/products", async (req, res) => {
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