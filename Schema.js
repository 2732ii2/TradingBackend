import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  symbol: { 
    type: String, 
    required: true, 
    enum: ["BTC-USDT", "ETH-USDT"], // Add more symbols as needed
  },
  side: { 
    type: String, 
    required: true, 
    enum: ["buy", "sell"], 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  expirationType: { 
    type: String, 
    required: true, 
    enum: ["duration", "datetime"] 
  },
  durationValue: { 
    type: Number, 
    required: function() { return this.expirationType === "duration"; },
    min: 0 
  },
  durationUnit: { 
    type: String, 
    required: function() { return this.expirationType === "duration"; },
    enum: ["minutes", "hours", "days"], 
  },
  dateTime: { 
    type: Date, 
    required: function() { return this.expirationType === "datetime"; },
  },
}, { timestamps: true,strict:false });

const Ordermodel= mongoose.model('Order', OrderSchema);

export default Ordermodel;