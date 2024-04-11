import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import path from "path";
//securty packges
import helmet from "helmet";
import dbConnection from "./dbConfig/index.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import router from "./routes/index.js";


import cookieParser from "cookie-parser";

const __dirname = path.resolve(path.dirname(""));


dotenv.config();

const app = express();
app.use(cookieParser());


app.use(express.static(path.join(__dirname, "views/build"),{
  type: 'application/javascript'
}));

// app.use(express.static('public', {
//   type: 'application/javascript'
// }));

const PORT = process.env.PORT || 6000;

dbConnection();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));


app.use(morgan("dev"));

app.use(router);

//error middleware
app.use(errorMiddleware);


app.listen(PORT, () => {
  
  console.log(`Server running on port: ${PORT}`);
});