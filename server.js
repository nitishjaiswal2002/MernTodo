const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);

//file import
const userModel = require("./model/userModel");
const todoModel = require("./model/todoModel");
const { userDataValidator, isEmailValidate } = require("./utils/authutils");
const isAuth = require("./middleware/isAuth");
const todoDataValidation = require("./utils/todoUtils");

//constants
const app = express();
const PORT = process.env.PORT;
const store = new mongodbSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

//db connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb Connected sucessfully"))
  .catch((err) => console.log(err));

//middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true })); //to find json payload data in vscode
app.use(express.json()); //for viewing postman data in vscode
app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);

app.get("/", (req, res) => {
  return res.send("Server is running....");
});

//register
app.get("/register", (req, res) => {
  res.render("registerpage");
});

app.post("/register", async (req, res) => {
  console.log(req.body);
  const { name, email, username, password } = req.body;

  // data validation
  try {
    await userDataValidator({ name, email, username, password });
  } catch (error) {
    return res.status(400).json(error);
  }

  try {
    // check if email and username exist
    const userEmailExist = await userModel.findOne({ email: email });
    if (userEmailExist) {
      return res.status(400).json(`Email already exist : ${email}`);
    }

    // check if  username exist
    const userNameExist = await userModel.findOne({ username: username });
    if (userNameExist) {
      return res.status(400).json(`Username already exist : ${username}`);
    }

    //hashed password
    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT)
    );

    // creating an obj of userSchema
    const userObj = new userModel({
      name: name,
      username: username,
      email: email,
      password: hashedPassword,
    });
    console.log(userObj);

    const userDb = await userObj.save(); //store the data in DB
    //console.log(userDb);
    //return res.status(201).json({
    // message:"User Created sucessfully",
    //data : userDb
    //})
    return res.redirect("/login");
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});

//login
app.get("/login", (req, res) => {
  res.render("loginpage");
});

app.post("/login", async (req, res) => {
  console.log(req.body);

  const { loginId, password } = req.body;

  if (!loginId || !password)
    return res.status(400).json("Missing User Credentials");

  //find the user with loginiD
  //Compare the password
  //session based auth
  // Log the loginId and password

  try {
    // find username and loginId
    let userDb = {};
    if (isEmailValidate({ key: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }

    // if user exist
    if (!userDb)
      return res.status(400).json("User not found, please register first");
    console.log(password, userDb.password);

    //compare password
    const isMatched = await bcrypt.compare(password, userDb.password);
    console.log(isMatched);

    //for wrong password
    if (!isMatched) return res.status(400).json("Incorrect Password");

    //session
    console.log(req.session);

    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,
      username: userDb.username,
      email: userDb.email,
    };

    //return res.status(200).json("login sucessfull");
    return res.redirect("/dashboard");
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: "error",
    });
  }

  //console.log(userDb);
  // return  res.send("login is working");
});

//dashboard
app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboardpage");
});

//logout
app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) console.log(err);
    //return res.status(200).json("logout sucessfull");
    return res.redirect("/login");
  });
});

// logout from all devices
app.post("/logout-out-from-all", isAuth, async (req, res) => {
  //user
  console.log(req.session);
  const username = req.session.user.username;

  //create session schema
  const sessionSchema = new mongoose.Schema({ _id: String }, { strict: false });
  //convert schema into model
  const sessionModel = mongoose.model("session", sessionSchema);

  // preform model.query
  try {
    const deleteDb = await sessionModel.deleteMany({
      "session.user.username": username,
    });

    console.log(deleteDb);
    return res.status(200).json({
      message: "Logout from all devices succesfull",
      data: deleteDb,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
});

//Todo,s  Api
app.post("/create-item", isAuth, async (req, res) => {
  console.log(req.body);
  const todo = req.body.todo;
  const username = req.session.user.username;

  //data validation
  try {
    await todoDataValidation({ todo });
  } catch (error) {
    return res.send({
      status:400,
      message:error,
    })
  }
  // create entry in DB
  const todoObj = new todoModel({ todo, username });
  try {
    const todoDb = await todoObj.save();
    return res.send({
      status: 201,
      message: "Todo created sucessfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
});

//read-item?skip=5
app.get("/read-item", isAuth, async (req, res) => {

  const username = req.session.user.username;
  const SKIP=Number(req.query.skip)||0;
  try {

    //const todoDbList = await todoModel.find({ username });
    const todoDbList=await todoModel.aggregate([ 
      // skip,limit,match
      {
        $match:{username:username},
      },
      {
        $skip:SKIP,
      },
      {
        $limit:3,
      },
    ])

     console.log(todoDbList);
    if (todoDbList.length === 0) {
      return res.send({
        status: 504,
        message: "No Todo Found",
      });
    }
    return res.send({
      status: 200,
      message: "Read sucess",
      data: todoDbList,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
});

// edit APi
app.post("/edit-item", isAuth, async (req, res) => {
  //findOneandUpdate({todoId,{todo:newData}})
  console.log(req.body);

  //find the todo from db
  const { newData, todoId } = req.body;
  const username = req.session.user.username;

  if (!todoId)
    return res.send({
      status: 400,
      message: "Missing TodoId",
    });

  // if todo missing

  //data validation
  try {
    await todoDataValidation({ todo: newData });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }

  // find todoId in db with blogID
  try {
    const todoDb = await todoModel.findOne({ _id: todoId });

    // Check if the todo item exists
    if (!todoDb)
      return res.send({
        status: 400,
        message: `No todo present with this todoId: ${todoId}`,
      });

    // Log the username and todoDb username for debugging
    console.log(username, todoDb.username);
    console.log(todoDb);

    //ownership check
    if (username !== todoDb.username) {
      return res.send({
        status: 403,
        message: "Not allow to edit the todo",
      });
    }

    const todoUpdatedDb = await todoModel.findOneAndUpdate(
      { _id: todoId },
      { todo: newData },
      { new: true }
    );

    return res.send({
      status: 200,
      message: "Todo updated Sucessfully ",
      data: todoUpdatedDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }

  return res.send("all ok");
});

app.post("/delete-item", isAuth, async (req, res) => {
  const todoId = req.body.todoId;
  const username = req.session.user.username;

  if (!todoId)
    return res.send({
      status: 400,
      message: "Missing TodoId",
    });

  try {
    // find the todo
    const todoDb = await todoModel.findOne({ _id: todoId });
    if (!todoDb)
      return res.send({
        status: 400,
        message: `No todo found with todoId : ${todoId}`,
      });

    // ownership check
    if (todoDb.username !== username) {
      return res.send({
        status: 403,
        message: "Not allow to delete the todo",
      });
    }

    const todoDeleteDb = await todoModel.findOneAndDelete({ _id: todoId });
    return res.send({
      status: 200,
      message: "Todo Deleted Sucessfully",
      data: todoDeleteDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log("Server is running at:8000");
  console.log(`http://localhost:${PORT}/`);
});
