
import express from "express";
import mongoose from "mongoose"
import http from "http";
import Ordermodel from "./Schema.js";
import cors from "cors";
import { Server } from "socket.io";
import cron from "node-cron";



const processOrders = async (orders) => {
  const currentTime = new Date();

  // Iterate through the orders and update based on the condition
  return Promise.all(
    orders.map(async (order) => {
      console.log(
        "1=>",
        order?.expirationType);

      const createdTime = new Date(order.createdAt);
      let expirationTime;

      if (order.expirationType === "duration") {
        // Handle duration-based expiration
        if (order.durationUnit === "minutes") {
          expirationTime = new Date(
            createdTime.getTime() + order.durationValue * 60 * 1000
          );
        } else if (order.durationUnit === "seconds") {
          expirationTime = new Date(
            createdTime.getTime() + order.durationValue * 1000
          );
        } else {
          console.warn("Unsupported duration unit:", order.durationUnit);
          return { ...order, active: false }; // Default to inactive for unsupported units
        }
      }
       else if (order.expirationType == "datetime") {
        // Handle dateTime-based expiration
        console.log("333")
        expirationTime = new Date(order.dateTime);
      } else {
        console.warn("Unsupported expiration type:", order.expirationType);
        return { ...order, active: false }; // Default to inactive for unsupported expiration type
      }

      // Compare expiration time with current time
      const isActive = expirationTime > currentTime;

      // Check the current state in the database and update if necessary
      const existingOrder = await Ordermodel.findOne({ _id: order?._id });
      if (!existingOrder?.notactive && !isActive) {
        console.log("1-");
        const resp = await Ordermodel.updateOne(
          { _id: order?._id },
          {
            $set: {
              notactive: true,
            },
          }
        );
        console.log(resp);
      }

      // Return the updated object with the `active` attribute
      return { ...order, active: isActive };
    })
  );
};




const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins; update this for security in production
    methods: ["GET", "POST"],
  },
});
// Middleware
app.use(express.json());
app.use(cors());

const callData=async()=>{
  const resp=await Ordermodel.find();
  return (resp);
}

// Set up the cron job to run every 5 seconds
cron.schedule("*/5 * * * * *",async () => {
  console.log("Running cron job...");
  const resp=await Ordermodel.find();
  processOrders(resp); // Update the orders array
  io.emit("sendingUpdatedData",{data:(await callData())});
  console.log("Updated orders:",processOrders(resp).length);
});
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  socket.on("recieveDataBack",async(data)=>{
    console.log(data);
    var val;
    for (var i=0;i<5;i++){
      val=await callData();
    }
    console.log("=>",val);
    io.emit("sendingUpdatedData",{data:val});
  })
  
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});





app.get("/",(req,res)=>{
    res.json("hello")
})
// Routes
app.post('/save',  async (req, res) => {
    // console.log(req.body);
    try {
      const {
        symbol,
        side,
        quantity,
        price,
        expirationType,
        durationValue,
        durationUnit,
        dateTime,
      } = req.body;
  
      // Validate input
      if (!symbol || !side || !quantity || !price || !expirationType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      if (
        expirationType === "duration" &&
        (!durationValue || !durationUnit)
      ) {
        return res.status(400).json({ error: "Duration fields are required" });
      }
  
      if (expirationType === "datetime" && !dateTime) {
        return res.status(400).json({ error: "DateTime is required" });
      }
  
      // Create order
      const newOrder = new Ordermodel({
        symbol,
        side,
        quantity,
        price,
        expirationType,
        durationValue: expirationType === "duration" ? durationValue : undefined,
        durationUnit: expirationType === "duration" ? durationUnit : undefined,
        dateTime: expirationType === "datetime" ? dateTime : undefined,
      });
  
      // Save to database
      const savedOrder = await newOrder.save();
      console.log(savedOrder);
      return res.status(201).json({ message: "Order saved successfully", data: savedOrder });
    } catch (error) {
      console.error("Error saving order:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });


  app.get("/getData",async(req,res)=>{
    try{
     const resp=await Ordermodel.find();
    //  console.log(resp);
     res.json({
        data:resp
     })
    }
    catch(e){
        res.json({
            err:e?.message
        })
    }
  })


const url=`mongodb+srv://Mkhan:Ashad123@cluster0.uydprj9.mongodb.net/`;
const ConnectDB=async()=>{
    // console.log("=>",MongoUsername,MongoPass)
    try{
        await mongoose.connect(`${url}`); 
        console.log('DB connected');
    }
    catch(e){
        console.log(e?.message);
    }
}
ConnectDB();
// Start server
// const PORT = 1200;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });
const PORT = 1200;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});