const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000

// config
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json())



// 
app.get('/', (req, res) => {
    res.send('Server running')
})

// Listen
app.listen(port,(req,res) => {
    console.log(`Server running is port number: ${port}`);
})