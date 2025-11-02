const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config(); 

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const uri = process.env.MONGO_URI;
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
});
const connection = mongoose.connection;
connection.once("open", () => {
    console.log("MongoDB connection has been established");
});

const fileRouter = require("./routes/file.route");
app.use("/api/file", fileRouter);

if (process.env.NODE_ENV === "production") {
    app.use(express.static("build"));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../build", "index.html"));
    });
}

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));