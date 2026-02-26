const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/busBookingDB")
.then(() => console.log("MongoDB Connected "))
.catch(err => console.log("Connection Error ", err));

const busSchema = new mongoose.Schema({
  name: String,
  route: String,
  price: Number
});

const Bus = mongoose.model("Bus", busSchema);

async function createBus() {
  const newBus = new Bus({
    name: "Nairobi Express",
    route: "Nairobi - Mombasa",
    price: 1500
  });

  await newBus.save();
  console.log("Bus Saved 🚍");
}

createBus();