const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
const bodyParser = require("body-parser"); //post에서 body 받기
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser(process.env.COOKIE_SECRET_KEY));

//Routers
const realtorRouter = require("./routers/realtorRouter"),
  agentRouter = require("./routers/agentRouter.js"),
  residentRouter = require('./routers/residentRouter.js'),
  agentMypageRouter = require('./routers/agentMypageRouter.js');


//View
const layouts = require("express-ejs-layouts");
app.set("view engine", "ejs");
app.use(layouts);

app.set("port", process.env.PORT || 3000);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/realtor", realtorRouter);
app.use("/agent", agentRouter);
app.use("/resident", residentRouter);
app.use("/agentMypage", agentMypageRouter);

app.listen(app.get("port"), () => {
  console.log("Realtor_page app listening on port " + app.get("port"));
});