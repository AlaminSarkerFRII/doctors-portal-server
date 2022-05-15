const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
// const { query } = require("express");
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

// jwt token verify & send to user verification

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    // call to next for forward
    next();
  });
}

// run function
async function run() {
  await client.connect();
  // services
  const serviceCollection = client.db("doctors_portal").collection("services");
  // bookings data stored
  const bookingCollection = client.db("doctors_portal").collection("bookings");
  // set user in db
  const userCollection = client.db("doctors_portal").collection("users");

  console.log("Database connected");

  // create api and get service data

  app.get("/service", async (req, res) => {
    const query = {};
    const cursor = serviceCollection.find(query);
    const services = await cursor.toArray();
    res.send(services);
  });

  //get user from database

  app.get("/user", verifyJWT, async (req, res) => {
    const users = await userCollection.find().toArray();
    res.send(users);
  });

  // check if user admin or not

  app.get("/admin/:email", async (req, res) => {
    const email = req.params.email;
    const user = await userCollection.findOne({ email: email });
    const isAdmin = user.role === "admin";
    res.send({ admin: isAdmin });
  });

  // make user as admin

  app.put("/user/admin/:email", verifyJWT, async (req, res) => {
    const email = req.params.email;
    const requester = req.decoded.email;
    const requesterAccount = await userCollection.findOne({ email: requester });
    // jodi user admin hoy than he can create an admin others user
    if (requesterAccount.role === "admin") {
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    } else {
      res.status(403).send({ message: "Forbidden" });
    }
  });

  // update or insert with put method set use in database

  app.put("/user/:email", async (req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: user,
    };
    const result = await userCollection.updateOne(filter, updateDoc, options);
    const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });
    res.send({ result, token });
  });

  // this is not a proper way to query
  //set booking date

  app.get("/available", async (req, res) => {
    const date = req.query.date;
    //step -1 get all service
    const services = await serviceCollection.find().toArray();

    // res.send(services);
    //step-2 get booking of that day Output:  [{},{},{},{},{}...]
    const query = { date: date };
    const bookings = await bookingCollection.find(query).toArray();
    // res.send(bookings);

    //step-3.for each services
    services.forEach((service) => {
      //step-4. find booking for this service , Output:  [{},{},{}]
      const serviceBookings = bookings.filter(
        (b) => b.treatment === service.name
      );
      //step.5- select slots for the serviceBookings : ['','','']
      const bookedSlots = serviceBookings.map((book) => book.slot);

      //step-6. select those slot those are not booked slots // ja miltechena tai nicchi

      const available = service.slots.filter(
        (slot) => !bookedSlots.includes(slot)
      );
      //step-7. set available slot
      service.slots = available;
    });
    res.send(services);
  });

  // post/ set booking data on database ..
  //API Naming Convention
  // app.get('/booking') / get all collection
  // app.get('/booking/:id') / get all collection
  //app.post('/booking) /add a new booking
  //app.patch("booking/:id") update a collection
  //app.delete("/booking/:id") delete

  // get  data from  user dashboard

  app.get("/booking", verifyJWT, async (req, res) => {
    const patient = req.query.patient;
    // check my token with others accounts
    const decodedEmail = req.decoded.email;
    if (patient === decodedEmail) {
      const query = { patient: patient };
      const bookings = await bookingCollection.find(query).toArray();
      return res.send(bookings);
    } else {
      return res.status(403).send({ message: "forbidden access" });
    }
    // const query = { patient: patient };
    // const bookings = await bookingCollection.find(query).toArray();
    // res.send(bookings);
    // console.log(bookings);
  });

  app.post("/booking", async (req, res) => {
    const booking = req.body;
    const query = {
      treatment: booking.treatment,
      date: booking.date,
      patient: booking.patient,
    };
    const exists = await bookingCollection.findOne(query);
    if (exists) {
      return res.send({ success: false, booking: exists });
    }
    const result = await bookingCollection.insertOne(booking);
    return res.send({ success: true, result });
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
