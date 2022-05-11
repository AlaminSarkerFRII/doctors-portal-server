const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// connect to mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zire0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// run function

async function run() {
  await client.connect();

  const serviceCollection = client.db("doctors_portal").collection("services");
  console.log("Database connected");

  // create api and get service data

  app.get("/service", async (req, res) => {
    const query = {};
    const cursor = serviceCollection.find(query);
    const services = await cursor.toArray();
    res.send(services);
  });

  try {
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Doctors portal server");
});

app.listen(port, () => {
  console.log(`Doctors Portal Running at ${port}`);
});
