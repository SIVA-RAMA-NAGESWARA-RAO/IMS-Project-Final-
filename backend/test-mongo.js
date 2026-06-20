const mongoose = require('mongoose');

const uri = "mongodb+srv://akurathisiva6_db_user:sobhansiva816@cluster0.p6zlfo7.mongodb.net/?appName=Cluster0";

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("Connected successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error:", err.message);
    process.exit(1);
  });
